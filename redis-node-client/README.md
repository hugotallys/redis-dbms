![](redis_logo.png "Redis")

# SGBD Redis

Aprendendo a utilizar o _SGBD_ Redis com algumas operações básicas em dados geoespaciais.

## Instalação

### Redis

Instale o Redis ([Linux](https://redis.io/docs/getting-started/installation/install-redis-on-linux/)). No _ubuntu_ basta executar os comandos: 

```console
curl -fsSL https://packages.redis.io/gpg | sudo gpg --dearmor -o /usr/share/keyrings/redis-archive-keyring.gpg

echo "deb [signed-by=/usr/share/keyrings/redis-archive-keyring.gpg] https://packages.redis.io/deb $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/redis.list

sudo apt-get update
sudo apt-get install redis
```

Para testar a instalação execute o comando (Redis CLI):

```console
$ redis-cli PING
```

o servidor irá responder com a mensagem `PONG`. Caso ocorra erro de conexão, tente iniciar o servidor (processo no background):

```console
$ redis-server &
```

### Node-Redis (opcional)

Para executar o todos os comandos desse tutorial (com _logs_ detalhados de execução), utilizando o [cliente Redis](https://www.npmjs.com/package/redis) para Node.js, basta instalar os pacotes e rodar o script de teste:


```console
$ npm install
$ npm run test
```

## Criando a base de dados

O Redis disponibiliza por padrão 16 bases de dados (_key namespace_) indexadas de `0-15`. Ao realizar a primeira conexão (endereço do servidor `localhost:6379`), a base de dados utilizada será a de índice `0`.

```console
$ redis-cli CLIENT LIST # ... laddr=127.0.0.1:6379 ... db=0 ...
```

## Inserindo novas instâncias

Começamos limpando todos os registros da base de dados atual:

```
$ redis-cli FLUSHDB
$ OK
```

Nesse tutorial vamos ilustrar a utilização do Redis utizando os comandos para tipos de dados geoespaciais (`Geospatial`). Supondo que estamos desenvolvendo um aplicativo que armazena a localização de diferentes estações de carregamento de veículos elétricos, podemos adicionar diferentes registros num mesmo índice geoespacial com o comando `GEOADD`:

```console
$ redis-cli
127.0.0.1:6379> GEOADD stations:ca -122.27652 37.805186 station:1
(integer 1)
127.0.0.1:6379> GEOADD stations:ca 122.26746 37.806234 station:2
(integer 1)
127.0.0.1:6379> GEOADD stations:ca -122.24698 37.810404 station:3
(integer 1)
127.0.0.1:6379> GEOADD stations:ny -74.042402 40.718098 station:4
(integer 1)
```

## Atualizando instâncias

Cometemos um erro (ausência do sinal negativo) ao adicionar a longitude do membro `station:2`. Para atualizar o valor basta reescrever o índice geospacial:

```console
127.0.0.1:6379> GEOADD stations:ca -122.26746 37.806234 station:2
(integer 0)
```

Se quisermos especificar no índice o tipo de estação (veículos elétricos), podemos atualizar a chave com o comando `RENAME`:

```console
127.0.0.1:6379> RENAME stations:ca stations:electric:ca
OK
127.0.0.1:6379> RENAME stations:ny stations:electric:ny
OK
```

## Realizando consultas

Podemos realizar difetentes consultas nos dados geoespaciais.

- `GEOPOS - Retorna longitude e latitude de um ou mais membros do índice geoespacial.`
```console
127.0.0.1:6379> GEOPOS stations:electric:ca station:1
1) 1) "-122.27652043104171753"
   2) "37.80518485897756165"
```

- `GEOSEARCH - Retorna todos os membros de um índice geoespacial num raio de até 2 km da localização especificada.`
```console
127.0.0.1:6379> GEOSEARCH stations:electric:ca FROMLONLAT -122.2612767 37.7936847 BYRADIUS 2 km WITHDIST
1) 1) "station:1"
   2) "1.8523"
2) 1) "station:2"
   2) "1.4979"
```

Vamos adicionar mais uma instância para ilustrar consultas feitas no índice:

```console
127.0.0.1:6379> GEOADD stations:gas:ny -74.0376913 40.7383154 station:5
(integer 1)
```

- `SCAN <cursor> MATCH <pattern> - Retorna o cursor e registros iterados que obedecem o padrão especificado.`
```console
127.0.0.1:6379> SCAN 0 MATCH *:*:ny
1) "0"                                  # Retorna cursor e índices
2) 1) "stations:gas:ny"                 # espaciais relacionados ao
   2) "stations:electric:ny"            # estado de Nova Iorque (ny)
```

Para deletar algum registro da base, utilizamos o comando `DEL <key>`:

```console
127.0.0.1:6379> DEL stations:gas:ny
(integer 1)
```

Listando o índice final da base:

```console
127.0.0.1:6379> SCAN 0
1) "0"
2) 1) "stations:electric:ca"
   2) "stations:electric:ny"
```

## Referências