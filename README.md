# OpenAurae Server

## Docs

- [Auth](docs/auth.md)

## Get Started

Clone

```shell
git clone https://github.com/orgs/openaurae/openaurae-server
```

Install dependencies and pre-commit hooks:

```sh
bun install
bun run lefthook
```

Set environment variables:

```shell
cat << EOF > .env
PORT=8000
JWT_SECRET=secret
CASSANDRA_HOST='127.0.0.1'
CASSANDRA_KEYSPACE='aurae'
EOF
```

Note: `JWT_SECRET` is confidential and hence is not commited to the git repo.
Please contact maintainer or the professor for the secret key.

Start a local server:

```sh
bun run dev
```

Check if server is running without error

```shell
curl http://localhost:8000/health
```

You should see the response below:

```json
{
  "status": "up"
}
```
