FROM python:3.12-slim
WORKDIR /app
COPY server/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r requirements.txt
COPY server /app/server
COPY client/public/models /app/client/public/models
RUN useradd --create-home app
USER app
EXPOSE 8000
CMD ["uvicorn","server.app:app","--host","0.0.0.0","--port","8000"]
