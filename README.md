# Backscan (custom version)

Este projeto é uma adaptação do projeto original:

https://github.com/PedroHBessa/backscan

Foram adicionadas melhorias como:

- coleta de fingerprint do navegador
- coleta de contexto da requisição (URL, referer, método)
- fallback de geolocalização via IP
- execução via Docker
- integração com Telegram Bot API

## Arquitetura

Cloudflare → Apache Reverse Proxy → Node.js (Express) → Telegram API

## Execução

docker compose up -d --build

## Variáveis de ambiente


BOT_TOKEN

CHAT_ID


## Créditos

Projeto original:
https://github.com/PedroHBessa/backscan
