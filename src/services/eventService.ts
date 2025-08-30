import { EventEmitter } from 'events';

// Create a singleton instance of EventEmitter to be used across the application.
const eventEmitter = new EventEmitter();

export default eventEmitter;
