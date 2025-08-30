import cuid from 'cuid';
import { query } from '../db.js';
import { log } from '../utils/logger.js';
import { User } from '../types.js';
import eventEmitter from './eventService.js';
import { broadcastToAdmins } from './websocketService.js';

const CONTEXT = 'AutomationService';

// --- Action Handlers ---
// These are placeholder functions. In a real app, they'd integrate with email services, etc.
const actionHandlers: { [key: string]: (data: any, logs: string[]) => Promise<void> } = {
    'Відправити Email привітання': async (userData: User, logs: string[]) => {
        const logMessage = `SIMULATING: Sending welcome email to ${userData.email}.`;
        log.info(`${CONTEXT}:Action`, logMessage);
        logs.push(logMessage);
        // Pretend it takes a moment
        await new Promise(resolve => setTimeout(resolve, 500));
    },
    'Записати лог про реєстрацію': async (userData: User, logs: string[]) => {
        const logMessage = `LOGGING: User registered: ${userData.name} (ID: ${userData.id}).`;
        log.info(`${CONTEXT}:Action`, logMessage);
        logs.push(logMessage);
    },
    // Add more handlers here as new actions are created
};


/**
 * Executes an automation flow based on a trigger type.
 * @param triggerType The type of event that triggered the flow (e.g., 'USER_REGISTERED').
 * @param triggerData The data associated with the trigger (e.g., the new user object).
 */
const executeFlow = async (triggerType: string, triggerData: any) => {
    const EXECUTION_CONTEXT = `${CONTEXT}:executeFlow:${triggerType}`;
    log.info(EXECUTION_CONTEXT, 'Starting flow execution.', { triggerData });

    // 1. Find the relevant automation flow in the database
    const flowResult = await query(
        'SELECT * FROM "AutomationFlow" WHERE "triggerType" = $1 AND "isActive" = true',
        [triggerType]
    );

    if (flowResult.rows.length === 0) {
        log.info(EXECUTION_CONTEXT, 'No active flow found for this trigger. Exiting.');
        return;
    }
    const flow = flowResult.rows[0];
    const { nodes, edges } = flow.flowData;

    // 2. Create a history record for this run
    const historyId = cuid();
    const logs: string[] = [`[${new Date().toISOString()}] Flow execution started.`];
    await query(
        `INSERT INTO "AutomationRunHistory" (id, "flowId", "triggerType", "triggerData", status, logs, "updatedAt")
         VALUES ($1, $2, $3, $4, 'STARTED', $5, $6)`,
        [historyId, flow.id, triggerType, triggerData, logs, new Date()]
    );

    try {
        // 3. Find the starting node (the trigger)
        const triggerNode = nodes.find((n: any) => n.type === 'triggerNode');
        if (!triggerNode) {
            throw new Error('Flow is invalid: No trigger node found.');
        }
        logs.push(`Found trigger node: ${triggerNode.data.label}`);

        // 4. Traverse the graph and execute actions
        let currentNode = triggerNode;
        while (currentNode) {
            const connectedEdges = edges.filter((e: any) => e.source === currentNode.id);
            if (connectedEdges.length === 0) {
                logs.push('Reached end of a branch.');
                break; // End of this path
            }

            // For simplicity, we'll follow the first edge. Parallel execution would be more complex.
            const nextEdge = connectedEdges[0];
            const nextNode = nodes.find((n: any) => n.id === nextEdge.target);

            if (!nextNode) {
                logs.push(`Warning: Edge leads to a non-existent node ID ${nextEdge.target}. Stopping branch.`);
                break;
            }
            
            logs.push(`Executing node: ${nextNode.data.label} (Type: ${nextNode.type})`);
            
            const handler = actionHandlers[nextNode.data.label];
            if (handler) {
                await handler(triggerData, logs);
                logs.push(`Successfully executed: ${nextNode.data.label}`);
            } else {
                logs.push(`Warning: No action handler found for "${nextNode.data.label}". Skipping.`);
            }

            currentNode = nextNode;
        }

        // 5. Update history record with success
        logs.push(`[${new Date().toISOString()}] Flow execution finished successfully.`);
        await query(
            'UPDATE "AutomationRunHistory" SET status = $1, logs = $2, "updatedAt" = $3 WHERE id = $4',
            ['SUCCESS', logs, new Date(), historyId]
        );
        log.info(EXECUTION_CONTEXT, 'Flow executed successfully.');

    } catch (error: any) {
        // 6. Update history record with failure
        const errorMessage = `Error during flow execution: ${error.message}`;
        log.error(EXECUTION_CONTEXT, errorMessage, error);
        logs.push(`[${new Date().toISOString()}] ${errorMessage}`);
        await query(
            'UPDATE "AutomationRunHistory" SET status = $1, logs = $2, "updatedAt" = $3 WHERE id = $4',
            ['FAILED', logs, new Date(), historyId]
        );
    } finally {
        // 7. Notify admin clients via WebSocket that a run has completed
        broadcastToAdmins({ type: 'AUTOMATION_RUN_COMPLETED' });
    }
};

/**
 * Initializes the automation service by setting up event listeners.
 */
export const initializeAutomationService = () => {
    log.info(CONTEXT, 'Initializing and setting up event listeners...');

    eventEmitter.on('USER_REGISTERED', (user: User) => {
        executeFlow('USER_REGISTERED', user);
    });

    // Add more listeners for other triggers here
    // eventEmitter.on('NEW_AD_POSTED', (ad) => { ... });
    
    log.info(CONTEXT, 'Event listeners are active.');
};