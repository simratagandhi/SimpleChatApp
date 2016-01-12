var express = require('express'),
	app = express(),		// app variable bundles everything of express
	server = require('http').createServer(app),	//for socket io, we need http server
	io = require('socket.io').listen(server),   //server to listen io
	users = {},						//array to store logged in users
	date = new Date(),				//new date variable to store msg date time 
	fs = require('fs'),				//file system to create db file
	file = 'chatdb.db',				//name of the db file chatdb
	exists = fs.existsSync(file);
	
	//defining the port for server to listen
	server.listen(8080);

	//if db file does not exists, it creats a new db file to use sqlite3 using filesystem
	if(!exists){
		console.log('creating db file!');
		fs.openSync(file,'w');
	}

	var sqlite3 = require('sqlite3').verbose();
	var db= new sqlite3.Database(file);
	
	//creates table in chatdb to store user messages
	db.serialize(function(data){		
		if(!exists){
			db.run("CREATE TABLE CHAT (nickname TEXT, msg TEXT, msgtime DATE)")
		}
	});

	//to access the index.html
	app.use(express.static(__dirname));
	
	//to access pages on browser -- set up a route
	app.get('/', function(req,res){
		res.sendfile(__dirname + '/index.html');
	});


	//next line - io.socket.on is to open the socket &  all socket code is inside this func
	io.sockets.on('connection', function(socket){
		socket.emit('try-login');

		socket.on('login', function(data, is_new, callback){
		if (is_new && data in users){
			callback(false);
		} else{
			db.all('SELECT * FROM CHAT', function(err,docs){
				console.log('length of docs:  '+ docs.length);
				if(err) 
					throw err;
				callback(true, docs);
				socket.username = data;
				users[socket.username] = socket;
				updateUsernames();
			});
		}
	});	

	//to update the array storing all usernames using keys
	function updateUsernames(){
		io.sockets.emit('usernames', Object.keys(users));
	}

	//THIS IS TO save msgs to db and send ALL MSGS to the client 
	socket.on('send message', function(data,date){
		var username=socket.username;
		var msgtime=date.toLocaleString();

			//to save all the msgs	
			var stmt = db.prepare('INSERT INTO CHAT VALUES(?,?,?)');			
			stmt.run(username, data, msgtime);			
			stmt.finalize();

			//send back the msg to client after storing in db
			io.sockets.emit('new message', { username:username,  msg: data, msgtime:msgtime});		
	});

	//disconnects socket and deletes the usernames from the array who logs out
	socket.on('disconnect', function(data){
		if(!socket.username) return;
		delete users[socket.username];
		updateUsernames();	

	});
	
});
