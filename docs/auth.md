# Auth

JWT issued from [Auth0](https://auth0.com/) is used for authentication and authorization.
Below is [an example](https://jwt.io/#debugger-io?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL2F1cmFlLmF1LmF1dGgwLmNvbS8iLCJzdWIiOiJhdXRoMHw1ZTYzMjIxMmZkN2ZmZDBjYjJiOGY0NWYiLCJhdWQiOlsiaHR0cDovL25ldy5vcGVuYXVyYWUub3JnL2FwaS8iXSwiaWF0IjoxNzE5NjcxMzIzLCJleHAiOjE3MTk3NTc3MjMsInNjb3BlIjoib3BlbmlkIHByb2ZpbGUgZW1haWwiLCJhenAiOiJOUXhlZnRwemREVFpIajU2SUVaQkdIS29nanpjN1dScyIsInBlcm1pc3Npb25zIjpbImFkbWluIl19.K2ijrosD3SRTC2gatZU3fH9oncvg_6qYflKvNQzXEVI) of JWT header and payload:

```json
{
  "alg": "HS256",
  "typ": "JWT"
}
```

```json
{
  "iss": "https://aurae.au.auth0.com/",
  "sub": "auth0|foo",
  "aud": [
    "http://new.openaurae.org/api/"
  ],
  "iat": 1719671323,
  "exp": 1719757723,
  "scope": "openid profile email",
  "azp": "NQxeftpzdDTZHj56IEZBGHKogjzc7WRs",
  "permissions": [
    "admin"
  ]
}
```

## Authentication

Client requests must include JWT in either headers or query params.
The JWT payload must contain the correct issuer (`https://aurae.au.auth0.com/`) 
and the audience (`http://new.openaurae.org/api/`). 

### Bearer Token

Most client requests include access token in request headers as bearer token. 

```shell
curl https://openaurae-server/api/v1/devices \
  --header "Authorization: Bearer auth0-jwt-token"
```

### Request Param

For file download, the URL must include the access token in query params.

```html
<a href="https://openaurae-server/api/v1/metrics/csv?deviceId=foo&accessToken=auth0-jwt-token">
    Export metrics of device foo 
</a>
```

## Authorization

`permissions` value of the JWT payload is used for authorization. 
Currently, there are 3 roles:

- `admin` can view and modify resources of all users 
- `read:admin` can view resources of all users, but can only modify their own resources
- users without permissions above can only view and modify their own resources 

