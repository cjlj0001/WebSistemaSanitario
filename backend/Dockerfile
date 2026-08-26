FROM mcr.microsoft.com/devcontainers/python:1-3.11-bookworm

WORKDIR /app

COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt
RUN pip uninstall -y opencv-python || true \
	&& pip install --no-cache-dir --force-reinstall opencv-python-headless==4.13.0.92

COPY backend /app/backend

ENV PYTHONUNBUFFERED=1

CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
