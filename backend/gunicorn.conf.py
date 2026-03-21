import os

bind = f"0.0.0.0:{os.getenv('PORT', '5000')}"

# Keep worker count intentionally low on Render free/small instances to reduce OOM SIGKILL.
workers = int(os.getenv("WEB_CONCURRENCY", "1"))
threads = int(os.getenv("GUNICORN_THREADS", "2"))
worker_class = os.getenv("GUNICORN_WORKER_CLASS", "gthread")

timeout = int(os.getenv("GUNICORN_TIMEOUT", "90"))
graceful_timeout = int(os.getenv("GUNICORN_GRACEFUL_TIMEOUT", "30"))
keepalive = int(os.getenv("GUNICORN_KEEPALIVE", "5"))
max_requests = int(os.getenv("GUNICORN_MAX_REQUESTS", "0"))
max_requests_jitter = int(os.getenv("GUNICORN_MAX_REQUESTS_JITTER", "0"))

# Forward stdout/stderr to Render logs.
accesslog = "-"
errorlog = "-"
loglevel = os.getenv("GUNICORN_LOGLEVEL", "info")
