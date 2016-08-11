import express from 'express';
import request from 'superagent';
import config from '../config.js';
import docker from '../utils/docker.js';

const router = express.Router();

const _postFlows = function(port, data, res){
	console.log(`connecting to localhost:${port}/flows`);
	console.log("posting");
	console.log(data);
	
	//REMOVE THIS TO -- PUT IN TO TEST!
	port = 1880;
	
	request
   			.post(`localhost:${port}/flows`)
   			.send(data)
   			.set('Accept', 'application/json')
   			.type('json')
   			.end((err, result)=>{
     			
     			if (err) {
       				console.log(err);
       				res.status(500).send({error:'could not contact node red'});
     			} else {
     				console.log("successfully installed new flows");
       				res.send({success:true});
     			}
   			});
}

const _waitForStart = function(container){
	return new Promise((resolve,reject)=>{
		container.attach({stream: true, stdout: true, stderr: true}, function (err, stream) {
    		stream.on('data', function(line) {
    			if (line.toString().indexOf("Started flows") != -1){
    				resolve();	
    			}
    		});
		});
	});
}


const _startContainer = function(container, flows, res){
	_waitForStart(container).then(function(){
		container.inspect(function (err, cdata) {
			console.log("starting container!");
			console.log(cdata);
			let port = cdata['NetworkSettings']['Ports']['1880/tcp'][0]['HostPort'];
			_postFlows(port, flows, res);
		});
	});
}

router.post('/flows', function(req, res){
	
	const flows = req.body;
	
	const opts = {
		filters : {
						label: [`user=${req.user.username}`],
						status: ['running', "exited"],			
		}
  	}	
	
	docker.listContainers(opts, function(err, containers) {
		console.log(`Containers labeled user=${req.user.username} ${containers.length}`);
		
		//create a new container and start it, if it doesn't exist
		if (containers.length <= 0){
			docker.createContainer({Image: 'docker_red', Labels: {'user':`${req.user.username}`}, Cmd: ['node', '/root/node-red/red.js'], name: `${req.user.username}-red`}, function (err, container) {
				if (err){
					console.log(err);
				}else{
					//{"PortBindings": { "1880/tcp": [{ "HostPort": "11022" }]}}
					container.start({"PublishAllPorts":true, "Links": ["mosquitto:mosquitto"]}, function (err, data) {
						if (err){
							console.log("error!");
							console.log(err);
						}else{
							_startContainer(container, flows, res);
						}
					});
				}
			});
		}else{
			const c = containers[0];
			//restart the container if it exists but is stopped
			if (c.State === 'exited'){
				console.log("restarting container!!");
				const container = docker.getContainer(c.Id);
				container.restart({}, function(err, data){
					if (err){
						console.log(err);
					}else{
						_startContainer(container, flows, res);
					}		
				});
			}else{
				//post flows to already running container
				let port = c.Ports[0]['PublicPort'];
				_postFlows(port, flows, res);
			}
		}
	});
});

module.exports = router;