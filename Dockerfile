# Dockerfile

# --- Этап 1: Сборщик (Builder) ---
# На этом этапе мы устанавливаем ВСЕ зависимости (включая devDependencies)
# и компилируем TypeScript в JavaScript.
FROM node:18-alpine AS builder
WORKDIR /usr/src/app

# Копируем package.json и package-lock.json для кэширования установки зависимостей
COPY package*.json ./
RUN npm install

# Копируем остальной код проекта
COPY . .

# Собираем проект (компиляция TS -> JS). Результат будет в папке /dist
RUN npm run build


# --- Этап 2: Исполнитель (Runner) ---
# На этом этапе мы создаем финальный, легковесный образ
# только с необходимыми для запуска файлами.
FROM node:18-alpine
WORKDIR /usr/src/app

# Копируем package.json, чтобы можно было установить только production-зависимости
COPY package*.json ./

# Устанавливаем ТОЛЬКО production-зависимости. Это делает образ меньше и безопаснее.
RUN npm install --omit=dev

# Копируем только скомпилированные файлы из этапа сборки
COPY --from=builder /usr/src/app/dist ./dist

# Render предоставит порт 10000. Наше приложение должно его слушать.
EXPOSE 10000

# Команда для запуска сервера в продакшн режиме
CMD ["npm", "run", "start:server"]