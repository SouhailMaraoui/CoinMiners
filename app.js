const https = require('https');
const fs = require('fs');

const hostname = '127.0.0.2';
const port = 443;

//Read the key and certificat 
const options = 
{
    key: fs.readFileSync('certificats/key.pem'),
    cert: fs.readFileSync('certificats/cert.pem')
};

//Create a server
const server = https.createServer(options, function(request, response) {
    //Send status code 200(OK message).
    response.writeHead(200);

    //Read index.html, return status code 404 in case no such file was found. 
    fs.readFile('index.html', function(err, html) {
        if(err)
        {
            response.writeHead(404);
            response.write("index.html not found");
        }
        else
        {
            response.write(html);
        }

        response.end();
    });
  });

//Start the server on hostname:port
server.listen(port, hostname, () => {
  console.log(`Server running at https://${hostname}:${port}/`);
});
