class Room{
	
	constructor(id,name, io){
		this.id=id;
		this.name=name;
		this.io=io;
		this.users = {};
		this.user_scores={};
		this.userscount =0;
		this.adduser = this.adduser.bind(this);
		this.getpublicData=  this.getpublicData.bind(this);
		this.startTurn = this.startTurn.bind(this);
		this.listeners = {'startgame':this.startgame, 'endgame': this.endgame, 'userturn':this.userturn}
		this.canjoin=true;
		this.current_turn=0;
		this.startingturn="";
		this.wining_score=50;
	}


	addListeners(user){
		for (let [key, value] of Object.entries(this.listeners)) {
  			user.on(key, value.bind(this, user));
		}
	}
	startgame(){
		this.canjoin=false;
		this.startingturn = setInterval(this.startTurn, 3000);
		this.roomUsersgamestart();

	}

	endgame(user, won){
		this.canjoin=true;
		if(this.startingturn!=""){
			clearInterval(this.startingturn);
			this.startingturn="";
		}
		this.user_scores={};
		this.current_turn=0;
		this.roomUsersgameend(user.name, won);
	}

	userturn(user){
		var keys=Object.keys(this.users);
		var current_user_id = keys[this.current_turn];
		if(user.id==current_user_id){
			this.startTurn();
		}else{
			user.emit("nsmessage", {msg:"not your turn", "action":"not_your_turn"})
		}
	}

	startTurn(){
		var score=this.rolldice();
		var keys=Object.keys(this.users);
		var current_user_id = keys[this.current_turn];
		var current_user =  this.users[current_user_id];
		if(current_user!=undefined){
			current_user.emit("nsmessage", {msg:"you got "+score, "action":"game_turn"});
		}
		
		var total_score = this.user_scores[current_user_id].total_score +score;
		this.user_scores[current_user_id]={'last_turn':score, 'total_score': total_score}
		this.current_turn++;
		this.roomUsers(current_user_id);

		if(this.current_turn>this.userscount-1){
			this.current_turn=0;
		}

		if(total_score>=this.wining_score){
			if(current_user!=undefined){
			current_user.emit("nsmessage", {msg:"Congrats, you Won", "action":"game_win"});
					}
			
			this.endgame(current_user, true);
			
		}
	}

	rolldice(){
		return Math.floor(Math.random() * 6)+1;
	}

	roomUsers(last_user_id){
		let userslist={};
		for (let [id, user] of Object.entries(this.users)) {
			var last_turn_user=false;
			if(last_user_id!="undefined" && last_user_id==id){
				last_turn_user=true;
			}
  			userslist[id]={'id':user.user_index, name:user.name, 
  			'last_turn':this.user_scores[id].last_turn, 
  			'total_score':this.user_scores[id].total_score,
  			'last_turn_user':last_turn_user
  			};
		}
		this.io.to(this.id).emit("roomuserlist", userslist);
	}
	roomUsersgamestart(){
		this.io.to(this.id).emit("nsmessage", {msg:"Game started with "+this.userscount + " players, wait for turn", "action":"game_started"});
	}

	roomUsersgameend(name, won){
		let userslist={};
		if(won==true){
			this.io.to(this.id).emit("nsmessage", {msg:"User "+ name +" won", "action":"game_end"});
		}else{
			this.io.to(this.id).emit("nsmessage", {msg:"User "+ name +" ended the game", "action":"game_end"});
		}
		
	}

	adduser(user){
		if(this.canjoin==false)return false;
		if(!this.isUserJoined(user)){
			user.join(this.id);
			this.users[user.id] = user;
			this.userscount++;
			this.addListeners(user);
			console.log("emitiing to room users")
			this.user_scores[user.id] ={'last_turn':0, 'total_score': 0};

			this.roomUsers();
			return true;
		}
		return false;
	}

	removeuser(user){
		if(this.isUserJoined(user)){
			user.leave(this.id);
			delete this.users[user.id];
			this.userscount--;
			return true;
		}
		return false;
	}
	isUserJoined(user){
		if(this.users[user.id]==undefined){
			return false;
		}
		return true;
	}

	getpublicData(user){
		return {id:this.id, name:this.name, userscount:this.userscount, isjoined:this.isUserJoined(user)};
	}
}
module.exports=Room;