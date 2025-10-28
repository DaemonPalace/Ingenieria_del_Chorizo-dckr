# Production stage with Nginx
FROM nginx:alpine
COPY . /usr/share/nginx/htm
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
