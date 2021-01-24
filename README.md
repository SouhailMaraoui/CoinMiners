# CoinMiners
* **Start the server by running the command `node .\app.js`**
	* Must first run `certificats/script.sh` to generate a private key and a signed certificat. 
    
* **BIND9 Folder contains the config files to setup a new zone and resolve domain names (www.coinminers.com, mail.coinminers.com, admin.coinminers.com). Copy to `/etc/bind`.**
	* If the browser fails to resolve the domain names, first check bind server status using `sudo systemctl status bind`, if everything seems fine, clear /etc/resolve.conf and restart the bind server with the command`sudo systemctl restart bind9`.
