const easyvk = require('easyvk');
const Bot = require('./bot');

class VkBot extends Bot {
	constructor(options = {}) {
		super();

		if (options.api_v == undefined) options.api_v = 5.95;

		this.options = options;
	}

	async showKeyboard(peer_id, message, options) {
		if(options[0].constructor != Array) options = [ options ];

		const buttons = options.map(opts =>
			opts.map(opt => { return {
				"action": {
		          "type": "text",
		          // "payload": "{\"button\": \"1\"}",
		          "label": opt.label || opt
		        },
		        "color": opt.color || "default"
			}})
		);

		const keyboard = JSON.stringify({ "one_time": true, buttons });

		let args = {
			peer_id,
			message,
			keyboard
		};

		if (this.options['api_v'] >= 5.92) args.random_id = 0;

		await this.customCommand('messages.send', args);
	}

	async sendMessage(peer_id, message, attachment){
		if(attachment instanceof Array)
			attachment = attachment.map(el => el.toString()).join(',');

		let args = {
			peer_id,
			message,
			attachment
		};

		if (this.options['api_v'] >= 5.92) args.random_id = 0;

		await this.customCommand('messages.send', args);
	}

	async start() {
		const vk = await easyvk(this.options);
		this.vk = vk;
	
		if (vk.session.group_id == undefined) 
			throw new Error('Token must be only group type!');
	
		const { connection } = await vk.bots.longpoll.connect({
			forGetLongPollServer: {
				group_id: vk.session.group_id
			},
			forLongPollServer: {
				wait: "15"
			}
		});
	
		this.customCommand = async (command, params) => (await vk.post(command, params)).vkr[0];
	
		this.uploadFile = async (peer_id, filePath) => {
			const {url} = await vk.uploader.getUploadURL('docs.getMessagesUploadServer', {peer_id}, false);
			const {vkr} = await vk.uploader.uploadFile(url, filePath, 'file', {});
			const {id, owner_id} = await this.customCommand('docs.save', {file: vkr.response.file});
			return `doc${owner_id}_${id}`;
		};
	
			//Слушаем новые сообщения
		connection.on('message_new', msg => {
			let peer_id, text, conversation = false, mentioned = false;
	
			if (this.options['api_v'] >= 5.80) {
				peer_id = msg.peer_id;
				text = msg.text;
				conversation = peer_id !== msg.from_id;
			}
			else {
				peer_id = msg.user_id;
				text = msg.body;
			}
	
			if (conversation) {
				mentioned = text.match(/\[.*](.*)/);
				text = mentioned ? mentioned[1].trim() : text;
			}
				
			this.handleText(peer_id, text, conversation, mentioned, msg);
		});
	}
}

module.exports = VkBot;