FROM nginx:alpine

# Copy static files
COPY ./frontend/ /usr/share/nginx/html/

# Copy ONLY server config into conf.d
COPY ./conf.d/default.conf /etc/nginx/conf.d/default.conf

# Expose ports
EXPOSE 80 443

# Healthcheck
HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost/health || exit 1

CMD ["nginx", "-g", "daemon off;"]