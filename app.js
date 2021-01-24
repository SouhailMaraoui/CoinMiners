const formidable = require('formidable');
const bcrypt = require('bcrypt');
const cookie = require('cookie');
const axios = require('axios');
const https = require('https');
const fs = require('fs');

const {v4:uuidv4} =require('uuid');

const www_hostname = '127.0.0.2';
const mail_hostname = '127.0.0.3';
const admin_hostname = '127.0.0.4';
const verify_hostname = '127.0.0.5';
const port = 443;

var loginMessage="";	//To display error messages for the user.
var users = [];			//List of users as read from the database.

//Options for TLS
const tls_options = 
{
    key: fs.readFileSync('certificats/key.pem'),
    cert: fs.readFileSync('certificats/cert.pem')
};

//Options for mTLS
var mtls_options = 
{
	requestCert: true,
  	rejectUnauthorized: false,
  	
	key: fs.readFileSync('certificats/key.pem'),
	cert: fs.readFileSync('certificats/cert.pem'),      	
  	ca: [fs.readFileSync('certificats/server_cert.pem')]
};

var cookie_options =
{
	secure: true,		//Alow cookies over HTTPS only (prevents MITM attacks)
	httpOnly: true,		//To block the ability to use document.cookie(and thus prevent XSS attacks from stealing session ID) 
	maxAge:60 			//60sec
};

//Create a www. server
const www_server = https.createServer(tls_options,function(request, response) {
	var cookies = cookie.parse(request.headers.cookie || '');
	var UID=cookies.UID;
	
	//Read users.json file 
	var form = new formidable.IncomingForm();
    fs.readFile('users.json','utf8',function readFileCallback(err,data){
		if(err) console.log(err);
		else users=JSON.parse(data);
	});
		
	//Login Webpage
	if (request.url=="/login"){
		//Read login.html, return status code 404 in case no such file was found. 
		fs.readFile('login.html', function(err, html) {
        if(err)response.writeHead(404);
        else {
        	response.write(html);
        	response.write(loginMessage);
        }
        response.end();
    	});
	}
	
	//Web page to manage user login
    else if (request.url=="/logingin"){
		form.parse(request, async function (err, fields) {
			const usrn=fields.username;
			const pwd=fields.pwd;
    		
    		var usr_exist=false;
    		
    		for(var user of users)
    		{
    			if(user.usrn===usrn)
    			{
    				usr_exist=true;
    				if(await bcrypt.compare(pwd,user.pwd))
    				{
    					console.log("old user")
    					loginMessage="";
						response.setHeader('Set-Cookie', cookie.serialize('UID',user.UID,cookie_options));
    					response.writeHead(301,{Location: 'https://www.coinminers.com/'});
        				response.end();
    				}
    				else
    				{
    					loginMessage="Wrong password, Try again."
						response.writeHead(301,{Location: 'https://www.coinminers.com/login'});
						response.end();
    				}
    			}
    		}
    		
    		if(!usr_exist)
    		{
    			const salt = await bcrypt.genSalt();
				const hashedPassword = await bcrypt.hash(pwd, salt);
				const UID=uuidv4();
				const current_user={
					"usrn": usrn,
					"pwd": hashedPassword,
					"UID": UID
				};
    		
				response.setHeader('Set-Cookie', cookie.serialize('UID',UID,cookie_options));
				
    			users.push(current_user);
				var json= JSON.stringify(users);
				fs.writeFile("users.json",json,'utf8',function (err){});
				response.writeHead(301,{Location: 'https://www.coinminers.com/'});
		    	response.end();
    		}
		});
    }
    
    //Signout Webpage
    else if (request.url=="/signout"){
    	console.log("clear");
		response.setHeader('Set-Cookie', cookie.serialize('UID',0,cookie_options));
		response.writeHead(301,{Location: 'https://www.coinminers.com/login'});
		response.end();
	}
	
    //Home Webpage
    else {
    	var current_user=null;
		for(var user of users)
		{
			if(user.UID===UID)
			{
				current_user=user;
			}
		}
		
		if(current_user===null)
		{
			response.writeHead(301,{Location: 'https://www.coinminers.com/login'});
			response.end();
		}
		else 
		{
			response.writeHead(200, {'Content-Type': 'text/html'});
			response.write("Hello "+current_user.usrn);
			response.write('<br><a href="https://www.coinminers.com/signout">Click here to sign out</a>');
			response.end();
		}
    }
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
www_server.listen(port, www_hostname, () => {});
admin_server.listen(port, admin_hostname, () => {});
verify_server.listen(port, verify_hostname, () => {});

