.PHONY: help build up down restart logs clean generate-ssl test

help:
	@echo "License Server Makefile Commands:"
	@echo "  make build          - Build Docker images"
	@echo "  make up             - Start all services"
	@echo "  make down           - Stop all services"
	@echo "  make restart        - Restart all services"
	@echo "  make logs           - View logs (all services)"
	@echo "  make logs-server    - View license server logs"
	@echo "  make clean          - Remove all containers, volumes, and images"
	@echo "  make generate-ssl  - Generate self-signed SSL certificates"
	@echo "  make test           - Test the license server health"
	@echo "  make shell          - Get shell access to license server container"

build:
	docker-compose build

up:
	docker-compose up -d

down:
	docker-compose down

restart: down up

logs:
	docker-compose logs -f

logs-server:
	docker-compose logs -f license_server

clean:
	docker-compose down -v
	docker rmi $$(docker images -q webrtc_backend-license_server 2>/dev/null) || true

generate-ssl:
	bash generate-ssl.sh

test:
	@echo "Testing license server health..."
	@curl -s http://localhost:8000/health | python3 -m json.tool || echo "Server not running"

shell:
	docker-compose exec license_server /bin/bash
