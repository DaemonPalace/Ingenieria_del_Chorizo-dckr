FROM node:18

WORKDIR /app

COPY package*.json ./
RUN npm install --quiet

COPY . .

EXPOSE 3000

# Copiar script de inicio
RUN chmod +x /app/start.sh

CMD ["/app/start.sh"]
