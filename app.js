var formidable = require('formidable');
const axios = require('axios')
const https = require('https');
const fs = require('fs');

const www_hostname = '127.0.0.2';
const mail_hostname = '127.0.0.3';
const admin_hostname = '127.0.0.4';
const verify_hostname = '127.0.0.5';
const port = 443;

//Read the key and certificat 
const tls_options = 
{
    key: fs.readFileSync('certificats/key.pem'),
    cert: fs.readFileSync('certificats/cert.pem')
};

var mtls_options = 
{
    	key: fs.readFileSync('certificats/key.pem'),
    	cert: fs.readFileSync('certificats/cert.pem'),
      	requestCert: true,
      	rejectUnauthorized: false,
      	ca: [fs.readFileSync('certificats/server_cert.pem')]
};

//Create a www. server
const www_server = https.createServer(tls_options, function(request, response) {
    //Send status code 200(OK message).
    response.writeHead(200);

    //Read index.html, return status code 404 in case no such file was found. 
    fs.readFile('index.html', function(err, html) {
        if(err){response.writeHead(404);
            	response.write("index.html not found");}
        
        else	response.write(html);
        
        response.end();
    });
  });

//Create a verify. server (to verify client certificate)
const verify_server = https.createServer(tls_options, function(request, response) {
	if (request.url == '/redirect') {
		var form = new formidable.IncomingForm();
		form.parse(request, function (err, fields, files) {
			var temp_agent=new https.Agent({
				cert: fs.readFileSync(files.uploadedcert.path),
				key: fs.readFileSync(files.uploadedkey.path),
				rejectUnauthorized: false
			});
			
			axios.get('https://admin.coinminers.com/authenticate', { httpsAgent : temp_agent })
			.then(res => {
			console.log(res.data);
			text=res.data;
			response.writeHead(301,{Location: 'https://admin.coinminers.com/verified'});
			response.end();
			});
		});
	} else {
		response.writeHead(200, {'Content-Type': 'text/html'});
		response.write('<form action="redirect" method="post" enctype="multipart/form-data">');
		response.write('Select Certificate :<br><input type="file" name="uploadedcert"><br><hr>');
		response.write('Select Key :<br><input type="file" name="uploadedkey"><br><hr>');
		response.write('<input type="submit">');
		
		response.write('</form>');
		
		return response.end();
	}
});

//Create a admin. server
const admin_server = https.createServer(mtls_options,
    (req, res) => {
    if(req.url == '/authenticate')
    {
    	console.log("imhere");
		const cert = req.socket.getPeerCertificate();
		if (req.client.authorized) {
			res.write(`Hello ${cert.subject.CN}. your certificate was issued by "${cert.issuer.CN}"!`);
			res.end();
		} else if (cert.subject) {
			res.write(`Sorry ${cert.subject.CN}, certificates from "${cert.issuer.CN}" are not authorized.`);
			res.end();
		} else {
			res.write(`You need to provide a valid client certificate to continue.`);
			res.end();
		}
    }
    else if (req.url == '/verified')
    {
		res.write(text);
		res.end();
    }
    else
    {
    	res.writeHead(301,{Location: 'https://verify.coinminers.com'});
		res.end();
    }
});

//Start the servers on their respective hostname:port
www_server.listen(port, www_hostname, () => {
  console.log(`www Server running at https://${www_hostname}:${port}/`);
});
admin_server.listen(port, admin_hostname, () => {
  console.log(`admin Server running at https://${admin_hostname}:${port}/`);
});
verify_server.listen(port, verify_hostname, () => {
  console.log(`verify Server running at https://${verify_hostname}:${port}/`);
});
