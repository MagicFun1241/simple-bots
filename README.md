# simple-bots
Небольшая надстройка над [easyvk](https://github.com/ciricc/easyvk), специально для создания чат-ботов.

### Подключение библиотеки
Прежде всего, у вас должны быть установлены [NodeJs](https://nodejs.org), [Yarn](https://yarnpkg.com/lang/en/)
и [Git](https://git-scm.com/downloads).

Подключите simple-bots как зависимость к проекту или создайте пустой каталог и выполните команду:

```
yarn add https://github.com/khok/simple-bots
```

### Настройки со стороны ВК
В группе ВК, которую вы администрируете, откройте раздел Управление.
 1) Перейдите в раздел Сообщения. Включите сообщения сообщества.
 2) В Сообщения &rarr; Настройки для бота включите возможности ботов (необходимо для клавиатуры).
 3) Перейдите в раздел Настройки &rarr; Работа с API &rarr; Ключи доступа.
 Создайте ключ, разрешив доступ к управлению сообществом и сообщениям (остальные пункты опционально, но желательно
выбрать все). Сразу скопируйте его, т.к. при выходе из меню он скрывается.
 4) Перейдите на вкладку Long Poll API. Включите Long Poll и выберите его версию (желательно 5.80). В Типы Событий
 выберите Входящие сообщения.

### Пример бота
Создайте файл *test.js* следующего содержания:

```javascript
const { VkBot } = require('simple-bots');

const bot = new VkBot({
    access_token: '914wrwefdsu23u4doiugsdpoiuwe242fwefwdrwe'
});

bot.default(async (dialog, text) => {
    const answer = await dialog.wait('Введите что нибудь');
    dialog.send(`Вы написали ${text}, а ответили ${answer}`);
});

bot.start();
```

Запустите бота командой `node test.js`. Попробуйте написать ему что-нибудь ЛС.

### Использование префиксов

```javascript
const { VkBot } = require('simple-bots');

const bot = new VkBot({
    access_token: '914wrwefdsu23u4doiugsdpoiuwe242fwefwdrwe'
});

//Задаём префикс для комманд так
bot.setBotPrefix('бот');
//Или так, если хотим задать больше, чем один
//  bot.setBotPrefix(['бот', 'ботик']);


bot.command('привет', dialog => dialog.send('Привет'));

bot.start();
```

### Более компексный пример

```javascript
const { VkBot } = require('simple-bots');
const path = require('path');

const token = '914wrwefdsu23u4doiugsdpoiuwe242fwefwdrwe'; //Ключ бота
const v_api = 5.80; //Версия Long-Poll API.

const bot = new VkBot({
    access_token: '914wrwefdsu23u4doiugsdpoiuwe242fwefwdrwe',
    v_api: 5.80 //Версия Long-Poll API.
});

//Объявляем команду
bot.command('/reset', async dialog => {
    //Сбрасываем ожидание ответа от пользователя.
    if(!dialog.reject())
        dialog.send(`Используется только при ожидании ответа`);
});

bot.command('/hello', async dialog => {
    //Ожидаем ответа от пользователя.
    const answer = await dialog.wait('Введите что нибудь');
    if(answer != undefined)
        dialog.send('Вы ввели: ' + answer);
});

//Если бот не определил команду, он использует обработчик по умолчанию.
bot.default(async (dialog, text) => {
    await dialog.send(`Я не знаю, что такое ${text}`);

    //Кнопки будут в два ряда, т.е:
    //  Первая кнопка  | другая кнопка
    //           Третья кнопка
    //
    const btns = [
            [{label:'Первая кнопка', color:"primary"}, 'другая кнопка'],
            [{label:'Третья кнопка', color:"positive"}]
            ];

    const answer = await dialog.askOption('Выбери кнопку', btns);

    if(answer == undefined)
        return;

    if(btns.some(rows => rows.some(btn => btn == answer || btn.label == answer)))
        dialog.send(`Спасибо, что выбрали ${answer}`);
    else
        dialog.send(`Нет варианта ${answer}`);
});

bot.start();
console.log('Бот запущен!');
```
Запустите бота: `node test.js`. Подождите пару секунд, и, если не появится ошибка,
попробуйте отправлять ему через ВК команды */reset*, */hello* или что-нибудь еще.

### Описание API бота

Команды бота задаются так `bot.command('команда', handler)`. Когда пользователь присылает
пользователю сообщение, которое *посимвольно* совпадает с одной из команд, вызывается `handler(dialog)`,
где dialog - особая структура, поля которой перечислины ниже.

`bot.command.default(handler)` задает обработчик по умолчанию, который вызывается, если сообщение
не совпало ни с одной из команд. В отличие от `command`, в  `handler` также передается текст сообщения.
Обратите внимание, что обработчик по умолчанию не вызовется, если мы ожидаем от пользователя ответа
(например, через `await dialog.wait()` `await dialog.askOption()`), а команда - вызовется.

Очистить список команд можно так: `dialog.cleanCommands()`.

`dialog` содержит ряд свойств и async функций, реализующих работу с VkApi. Примеры их использования:

* `message` - объект, содержащий данные о текущем сообщении. В свою очередь содержит поля date, text и другие.

* `await dialog.send(message, attachment = undefined)` - отправляет сообщение пользователю. `attachment` -
 массив [медиавложений](https://vk.com/dev/attachments_m). message может быть пустой строкой, если вложения не пусты.
 `await` можно опустить, но лучше использовать его, если вам важен порядок одновременно отправленных сообщений.
 
 * `await dialog.wait(message = undefined)` - ожидает от пользователя ввода текста. Обязательно используйте с `await`;
 
 * `await dialog.askOption(message, options)` - показывает пользователю клавиатуру. options может быть одномерным
 либо двумерным массивом, чтобы показать кнопки в несколько строк. Каждый элемент массива может быть простым текстом, либо
 JSON-ом вида `{label": кнопка", "color":"primary"}`. Цвета описаны [здесь](https://vk.com/dev/bots_docs_3?f=4.1.%2BПодключение).
 Обязательно используйте с `await`;


 * `await dialog.uploadFile(filePath)` - загружает файл с компьютера и возвращает его код как медиавложения, которое вы
 можете затем отправить через `dialog.output`. Обязательно используйте с `await`.
 
 * `await custom(method, params)` - вызывает метод `method` VK API с указанными параметрами в виде JSON-объекта,
 возвращает JSON c данными. Используйте с `await`, если вам нужны возвращаемые из функции данные.
 
 Также имеется две не async функции, задействующих VkApi косвенно: 
  * `reject(code)` - если от пользователя ожидается ответ (в результате показа клавиатуры или вызова `input`), 
  генерируется исключение `code`, которое необходимо обработать в коде обработчика, ожидающего ответ.
  Функция возвращает `true`, если в момент ее вызова от пользователя ожидался ответ, иначе `false`.
   * `getId()` - возвращает ID пользователя, с которым ведется диалог.
