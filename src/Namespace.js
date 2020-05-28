const Room = require("./Room");
class Namespace{
	
	constructor(endpoint, name, io){
		this.io=io;
		this.endpoint=endpoint;
		this.name=name;
		this.onUserConnection= this.onUserConnection.bind(this);
		this.createroomrequest= this.createroomrequest.bind(this);
		this.sendRoomsList = this.sendRoomsList.bind(this);
		this.sendToAllUsersInNameSpace = this.sendToAllUsersInNameSpace.bind(this);
		this.ondisconnect = this.ondisconnect.bind(this);
		this.users = {};
		this.rooms = {};
		this.rooms_length =0;
		this.listeners = {'createroomrequest':this.createroomrequest, 
							'joinroomrequest':this.joinroomrequest,
							'leaveroomrequest':this.leaveroomrequest,
							'disconnect': this.ondisconnect
						}

		this.user_index=1;
	}

	

	onUserConnection(user){
		let name = user.handshake.query.name;
		user.name=name;
		user.user_index=this.user_index++;
		this.users[user.id]=  user;
		this.sendRoomsList(user);
		this.addListeners(user);
	}

	ondisconnect(user){
		delete this.users[user.id];
		this.removeFromAllRooms(user);
		this.removeListeners(user);
		this.sendToAllUsersInNameSpace();
	}

	addListeners(user){
		for (let [key, value] of Object.entries(this.listeners)) {
  			user.on(key, value.bind(this, user));
		}
	}

	removeListeners(user){
		user.removeAllListeners();
	}
	removeFromAllRooms(user){
		for (let [id, room] of Object.entries(this.rooms)) {
			this.rooms[id].removeuser(user);
		}
	}

	getRoomsPublicData(user){
		this.data={};
		for (let [id, room] of Object.entries(this.rooms)) {
  			this.data[id]=this.getRoomPublicData(id, room, user)[id];
		}
		return this.data;
	}

	getRoomPublicData(id,room, user){
		var data={};
		data[id]=room.getpublicData(user);
		return data;
	}


	sendToAllUsersInNameSpace(){
		var that=this;
		for (let [id, user] of Object.entries(this.users)) {
			that.sendRoomsList(user);
		}
	}

	sendRoomsList(user){
		user.emit("nsmessage", 
			{
			"action":"roomlist", 
			"data":this.getRoomsPublicData(user)
			}
		);
	}

	joinroomrequest(user, msg){
		var roomid= msg.id;
		if(this.rooms[roomid] !=undefined){
			var added = this.rooms[roomid].adduser(user);
			var data={};
			if(added){
				this.sendToAllUsersInNameSpace();
				data=this.getRoomPublicData(roomid, this.rooms[roomid], user)[roomid];

			}
			user.emit("nsmessage", 
				{
				"action":"joinroomrequest", 
				"success": added,
				"data":data
				}
			);
		}
	}

	leaveroomrequest(user, msg){
		var roomid= msg.id;
		if(this.rooms[roomid] !=undefined){
			var removed = this.rooms[roomid].removeuser(user);
			if(removed){
				this.sendToAllUsersInNameSpace();
			}
			user.emit("nsmessage", 
				{
				"action":"leaveroomrequest", 
				"data":this.getRoomPublicData(roomid, this.rooms[roomid], user)[roomid]
				}
			);
		}
	}


	createroomrequest(user, msg){
		var l = ++this.rooms_length;
		this.rooms[l]=new Room(l, "Room "+ l, this.io);
		this.sendToAllUsersInNameSpace();
		user.emit("nsmessage", 
			{
			"action":"createroomrequest", 
			"data":this.getRoomPublicData(l, this.rooms[l], user)[l]
			}
		);

	}


}
module.exports=Namespace;