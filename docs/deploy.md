# Build and Deploy

## Build Executable

```shell
bun run build-server
```

## Deploy as a Systemd Service

Create a file named `openaurae-server.service` under `/etc/systemd/system` 

```unit file (systemd)
[Unit]
Description=OpenAurae Server.
After=network-online.target,scylla-server.service

[Install]
WantedBy=multi-user.target

[Service]
Type=exec
ExecStart=/var/openaurae/openaurae-server
WorkingDirectory=/var/openaurae/
Restart=on-failure
RestartSec=5s

StandardOutput=journal
StandardError=journal
SyslogIdentifier=openaurae-server
```

```shell
sudo cp openaurae-server.service /etc/systemd/system/openaurae-server.service
sudo systemctl daemon-reload
sudo systemctl start openaurae-server

# Update server logic and rebuild the openaurae-server executable
sudo systemctl stop openaurae-server && \
sudo cp openaurae-server /var/openaurae/ && \
sudo systemctl start openaurae-server
```
