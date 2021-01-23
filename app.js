const http = require('http');
const fs = require('fs');

const hostname = 'localhost';
const port = 8000;

//Create a server
const server = http.createServer(function(request, response) {
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
  console.log(`Server running at http://${hostname}:${port}/`);
});