const formidable = require('formidable');	//Get data across pages
const bcrypt = require('bcrypt');			//Hash passwords
const cookie = require('cookie');			//Write/read cookies
const axios = require('axios');				//Send HttpAgent with a certificate 
const https = require('https');				//Create an https server
const fs = require('fs');					//Read and write files from the system

const {v4:uuidv4} =require('uuid');			//Generated a Universally Unique Identifier for users session

var www_hostname = '127.0.0.2';
var admin_hostname = '127.0.0.4';
var verify_hostname = '127.0.0.5';

//Uncomment the following only if you have setup BIND9 zone!
/*
www_hostname = 'www.coinminers.com';
admin_hostname = 'admin.coinminers.com';
verify_hostname = 'verify.coinminers.com';
*/

const port = 443;

var loginMessage="";	//Field of login error messages to display to the user.
var users = [];			//List of all the users as read from the database.

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
  	ca: [fs.readFileSync('autorite/autorite.cer')]
};

//Options for cookies
var cookie_options =
{
	secure: true,		//Alow cookies over HTTPS only (prevent MITM attacks)
	httpOnly: true,		//To block the ability to use document.cookie(Prevent XSS attacks from stealing session ID) 
	maxAge:60 			//60sec
};

//Create a www. server
const www_server = https.createServer(tls_options,function(request, response) {

	//Read the user cookies
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
    					loginMessage="";
						response.setHeader('Set-Cookie', cookie.serialize('UID',user.UID,cookie_options));
    					response.writeHead(301,{Location: `https://${www_hostname}/`});
        				response.end();
    				}
    				else
    				{
    					loginMessage="Wrong password, Try again."
						response.writeHead(301,{Location: `https://${www_hostname}/login`});
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
				response.writeHead(301,{Location: `https://${www_hostname}/`});
		    	response.end();
    		}
		});
    }
    
    //Signout Webpage
    else if (request.url=="/signout"){
    	//Clear UUID and redirect
		response.setHeader('Set-Cookie', cookie.serialize('UID',0,cookie_options));
		response.writeHead(301,{Location: `https://${www_hostname}/login`});
		response.end();
	}
	
    //Home Webpage
    else {
    	var current_user=null;
    	
    	//Find whether or not the user has a previous sessions saved in the browser cookies 
		for(var user of users)
		{
			if(user.UID===UID)
			{
				current_user=user;
			}
		}
		
		//If not redirect to login page
		if(current_user===null)
		{
			response.writeHead(301,{Location: `https://${www_hostname}/login`});
			response.end();
		}
		//If he had display a welcome message.
		else 
		{
			response.writeHead(200, {'Content-Type': 'text/html'});
			response.write("Hello "+current_user.usrn);
			response.write('<br><a href="https://'+www_hostname+'/signout">Click here to sign out</a>');
			response.end();
		}
    }
  });

//Create a verify. server (to upload client certificate)
const verify_server = https.createServer(tls_options, function(request, response) {

	/* Hostname/redirect is used to send the uploaded cert and key to the admin webpage.
	Due to browsers security mesures, they don't ask the user to provide his certificate to "unsafe" website,
	So as an alternative, we send the cert and key with a new created httpAgent as an option to admin. webpage.
	*/
	if (request.url == '/redirect') {
		var form = new formidable.IncomingForm();
		form.parse(request, function (err, fields, files) {
			//The httpAgent
			var temp_agent=new https.Agent({
				cert: fs.readFileSync(files.uploadedcert.path),
				key: fs.readFileSync(files.uploadedkey.path),
				rejectUnauthorized: false
			});
			
			/*Send the httpAgent as options to admin_hostname/authenticate to verify his certificate
			Response is then stored in the var 'text'
			*/
			axios.get(`https://${admin_hostname}/authenticate`, { httpsAgent : temp_agent })
			.then(res => {
			text=res.data;
			response.writeHead(301,{Location: `https://${admin_hostname}/verified`});
			response.end();
			});
		});
	} 
	//Display a page for the user to uplaod his certificate and key.
	else {
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
const admin_server = https.createServer(mtls_options, (req, res) => {

	//Webpage used to verify the client certificate.
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
    
    //Webpage to show the result of the verifications (stored in the var 'text' as mentioned in line.187)
    else if (req.url == '/verified')
    {
		res.write(text);
		res.end();
    }
    
    //Redirect to the verify webpage
    else
    {
    	res.writeHead(301,{Location: `https://${verify_hostname}/`});
		res.end();
    }
});

//Start the servers on their respective hostname:port
www_server.listen(port, '127.0.0.2', () => {});
admin_server.listen(port, '127.0.0.4', () => {});
verify_server.listen(port, '127.0.0.5', () => {});

console.log(`Users Server running at https://${www_hostname}/` );
console.log(`Admin Server running at https://${admin_hostname}/` );

