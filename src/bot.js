class Bot {
	constructor() {
		this.waiting = {};
		this.reset = {};
		this.commands = {};
		this.resolveUndefined = false;
	}

	//Прекратить ожидать ответ от uid.
	stopWaitAnswer(uid) {
		this.waiting[uid] = undefined;
		this.reset[uid] = undefined;
	}

	//Войти в режим оиждания ответа от uid.
	waitAnswer(uid) {
		if(!this.resolveUndefined && this.waiting[uid])
			throw new Error('We already wait for answer');

		return new Promise((resolve, reject) => {
			this.waiting[uid] = msg => { 
				this.stopWaitAnswer(uid); 
				resolve(msg); 
			};
			this.reset[uid] = code => {
				this.stopWaitAnswer(uid);
				this.resolveUndefined ? resolve(undefined) : reject(code || new Error('Reject code not specified'))
			};
		});
	}

	//Принять ответ от uid.
	resolveAnswer(uid, msg) {
		if(!this.waiting[uid])
			return false;

		this.waiting[uid](msg);
		return true;
	}

	//Сгенерировать исключение в обработчике ожидания.
	rejectAnswer(uid, code) {
		if(!this.reset[uid])
			return false;

		this.reset[uid](code);
		return true;
	}

	//Установить обработчик команды
	command(command, handler) {
		this.commands[command] = handler;
	}

	//Установить обработчик текста не-команд.
	default(defaultHandler) {
		this.defaultHandler = defaultHandler;
	}

	//Задает префикс для комманд
	setBotPrefix(prefix) {
		switch (typeof prefix) {
			case 'string':
			case 'object':
				this.botPrefix = prefix;
				break;
			default:
				throw new TypeError('Prefix must be String or Array');
		}
	}

	//Обработчик текстовых сообщений
	handleText(uid, text, conversation, mentioned, message) {
		if (conversation && !mentioned) {
			switch (typeof this.botPrefix) {
				case 'string':
					if (text.startsWith(this.botPrefix))
						text = text.substring(this.botPrefix.length, text.length).trim();
					else return;
					break;
				case 'object':
					var ok = false;
					Object.keys(this.botPrefix).forEach((key, index) => {
						let prefix = this.botPrefix[key];
						let args = text.toLowerCase().split(' ');
			
						if (index != this.botPrefix.length - 1 && args[0] == prefix) {
							text = text.toLowerCase().substring(prefix.length, text.length).trim();
							ok = true;
						}
						else if (index == this.botPrefix.length - 1 && !ok) {
							if (args[0] !== prefix) ok = false;
							else {
								text = text.toLowerCase().substring(prefix.length, text.length).trim();
								ok = true;
							}
						}
					});
					if (!ok) return;
					break;
			}
		}

		const command = this.commands[text.toLowerCase()];

		if(!command && this.resolveAnswer(uid, text))
			return;

		const dialog = this.makeDialog(uid, conversation, mentioned, message);

		if (command)
			command(dialog);
		else if (this.defaultHandler)
			this.defaultHandler(dialog);
	}

	makeDialog(uid, conversation, mentioned, message) {
		const bot = this;
		return {
		 	async wait(text) {
				if(text)
					await this.send(text);
				return await bot.waitAnswer(uid);
			},
			async askOption(message, options) {
				await bot.showKeyboard(uid, message, options);
				return await bot.waitAnswer(uid);
			},
			async send(message, attachment) {
				await bot.sendMessage(uid, message, attachment)
			},
			async reply(message, attachment) {
				let args = {
					peer_id: this.message.from_id,
					message,
					reply_to: this.message.id,
					attachment
				};

				if (bot.options['api_v'] >= 5.92) args.random_id = 0;

				await bot.customCommand('messages.send', args);
			},
			reject(code) {
				return bot.rejectAnswer(uid, code);
			},
			async uploadFile(filePath) {
				return await this.uploadFile(uid, filePath);
			},
			async custom(method, params) {
				return bot.customCommand(method, params);
			},
			invoke(text) {
				bot.commands[text](bot.makeDialog(uid, conversation, mentioned, message));
			},
			getId() {
				return uid;
			},
			message,
			conversation, 
			mentioned
		};
	}

	cleanCommands() {
		this.commands = {};
	}
}

module.exports = Bot;