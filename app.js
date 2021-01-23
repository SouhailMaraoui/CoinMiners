const http = require('http');
const fs = require('fs');

const hostname = 'localhost';
const port = 8000;

const server = http.createServer(function(req, res) {
    res.writeHead(200);

    fs.readFile('index.html', function(err, html) {
        if(err)
        {
            res.writeHead(404);
            res.write("index.html not found");
        }
        else
        {
            res.write(html);
        }
        res.end();
    });
  });

server.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});