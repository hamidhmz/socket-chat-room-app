const   express = require("express"),
        app = express(),
        server = require("http").createServer(app),
        io = require("socket.io").listen(server),
        path1 = require("path"),
        mongoose = require("mongoose");
        users = {};

mongoose.connect("mongodb://localhost/chat", {useNewUrlParser: true})
    .then(() => console.log("Connected to MongoDB..."))
    .catch(err => console.error("could not connect to mongoDB...",err));



const chatSchema = mongoose.Schema({
    nick:String,
    msg:String,
    created:{type:Date,default:Date.now}
});

const Chat = mongoose.model("Message",chatSchema);

app.get("/",function(req,res){
    res.sendFile(path1.resolve(__dirname+"/index.html"));
});

io.on("connection",function(socket){
    Chat.find({},function(err,docs){
        if(err) throw err;;
        console.log("sending Old messages");
        socket.emit("load old msgs",docs);
    });
    // const query = Chat.find({});
    // query.limit(8).exec(function(err,docs){
    //     if(err) throw err;;
    //     console.log("sending Old messages");
    //     socket.emit("load old msgs",docs);
    // });
    socket.on("new user",function(data,callback){
        if(data in users){
            callback(false);
        }else{
            callback(true);
            socket.nickname = data;
            users[socket.nickname] = socket;
            // nicknames.push(socket.nickname);
            // io.sockets.emit("usernames",nicknames);
            updateNicknames();
        }
    });
    function updateNicknames(){
        io.emit("usernames",Object.keys(users));
    }
    socket.on("send message",function(data,callback){
        let msg = data.trim();
        if(msg.substr(0,3) === "/w "){
            msg = msg.substr(3);
            let ind = msg.indexOf(" ");
            if(ind !== -1){
                let name = msg.substring(0,ind);
                msg = msg.substring(ind+1);
                if(name in users){
                    users[name].emit("whisper",{msg:msg,nick:socket.nickname});
                    console.log("whisper!");
                }else{
                    callback("error! enter a valid user.");
                }
                
            }else{
                callback("error please enter a message for your whisper")
            }
        }else{
            const newMsg = new Chat({msg:msg,nick:socket.nickname});
            newMsg.save(function(err){
                if(err) throw err;
                io.emit("new message",{msg:msg,nick:socket.nickname});   
            });
        }
        // socket.broadcast.emit("new message",data);
    });
    socket.on("disconnect",function(data){
        if(!socket.nickname)return;
        delete users[socket.nickname];
        // nicknames.splice(nicknames.indexOf(socket.nickname),1);
        updateNicknames();
    });
});
server.listen(3000);
