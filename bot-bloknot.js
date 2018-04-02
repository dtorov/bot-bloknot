'use strict';

process.env.NTBA_FIX_319 = 1;

console.time('botStart');

const botToken = "565910811:AAEOU9_ddEoZn-jngdFkSlZF7FRf2kf1iak";

const TelegramBot = require('node-telegram-bot-api');

const mongoose = require('mongoose');

const mongoUri = "mongodb://127.0.0.1/bot-bloknot";

const moment = require('moment');
moment.locale(); 

mongoose.connect(mongoUri,{});

const recordSchema = new mongoose.Schema({
    //msg: mongoose.Schema.Types.Mixed
    text: String,
    date: Date,
    fromId: String,
    source: mongoose.Schema.Types.Mixed
  });

const botState = {
      current: "start",
      previos: ""  
}

let bloknotRecord = mongoose.model('records',recordSchema)

  let botBloknot = new TelegramBot(botToken);

  botBloknot.getMe()
        .then((info) => {
            botBloknot.startPolling();
            console.timeEnd('botStart');

            let options = {
                parse_mode: 'HTML',
                reply_markup: JSON.stringify({	  
                resize_keyboard: true,
                keyboard: [
                ['поиск']		
                ]
              })
            };

            let deleteInlineKeyboard;

            botBloknot.onText(/\/start/, function (msg, match) {
                const chatId = msg.chat.id;
                const chatStart = "Привет. Шлите мне сообщения - я всех их сохраню. Для поиска - нажмите кнопку поиск ниже.";
                botBloknot.sendMessage(chatId, answer(msg), options);                      
            });

            botBloknot.onText(/\поиск/, function (msg, match) {
                const chatId = msg.chat.id;
                const replyMessage = "Что ищем хозяина?";
                botState.previos = botState.current;
                botState.current = 'search';
                botBloknot.sendMessage(chatId, replyMessage, options);                      
            });

            botBloknot.on('message', (msg) => { 
                const chatId = msg.chat.id;
                //console.log(msg);
                if(botState.current !== 'search'){
                    if(msg.text !== undefined && msg.text !== 'поиск'){
                        
                        bloknotRecord({text: msg.text, date: new Date(),fromId: msg.from.id, source: msg}).save(function (err, newRecord) {
                            if (err) return console.log(err);
                            //console.log('write ok,')
                            botBloknot.sendMessage(chatId, 'saved', options);
                            // saved!
                        });
                        }
                    if(msg.caption !== undefined && msg.text !== 'поиск'){
                        bloknotRecord({text: msg.caption, date: new Date(),fromId: msg.from.id, source: msg}).save(function (err, newRecord) {
                            if (err) return console.log(err);
                            //console.log('write ok,')
                            botBloknot.sendMessage(chatId, 'saved', options);
                            // saved!
                        });
                    }
                    } else {
                        
                        //var re = new RegExp("/"+msg.text+"/","i");
                        var re = new RegExp(msg.text,"i");
                        //console.log(re)
                        bloknotRecord.find({ text: re, fromId: msg.from.id }).sort({date: -1}).exec( function(err, result){
                            if(result.length > 0){
                                botBloknot.sendMessage(chatId, 'что я нашёл:', options);
                                
                                for(let i=0; i < result.length; i++){
                                    deleteInlineKeyboard = {
                                        parse_mode: 'HTML',
                                        reply_markup: JSON.stringify({	  
                                        resize_keyboard: true,
                                        inline_keyboard: [
                                        [{text: 'удалить', callback_data: 'delete_'+result[i]._id}]		
                                        ]})
                                    }
                                  if(result[i].source.caption == undefined){  
                                    botBloknot.sendMessage(chatId, moment().format('lll') + '\r\n' + result[i].text, deleteInlineKeyboard);
                                  } else {
                                      if(result[i].source.photo !== undefined){
                                          console.log(result[i].source.photo[chatId,result[i].source.photo.length -1].file_id);
                                          deleteInlineKeyboard.caption = moment().format('lll') + '\r\n' + result[i].source.caption;
                                        botBloknot.sendPhoto(chatId,
                                                result[i].source.photo[chatId,result[i].source.photo.length -1].file_id,
                                                deleteInlineKeyboard
                                            
                                         );
                                      } else {
                                        if(result[i].source.document !== undefined){
                                            console.log(result[i].source.document.file_id);
                                            deleteInlineKeyboard.caption = moment().format('lll') + '\r\n' + result[i].source.caption;
                                          botBloknot.sendDocument(chatId,
                                                  result[i].source.document.file_id,
                                                  deleteInlineKeyboard                                              
                                           );
                                        }

                                        //botBloknot.sendMessage(chatId, moment().format('lll') + '\r\n' + result[i].caption+' - format unsupported', deleteInlineKeyboard); 
                                      } 
                                  }
                                }
                                //console.log(result);
                            } else {
                                botBloknot.sendMessage(chatId, 'ничего похожего на '+msg.text+' не найдено.');
                            }
                        });

                        botState.previos = botState.current;
                        botState.current = 'add';
                    }
                
                 
            })

            botBloknot.on('callback_query', (msg) => {
                const chatId = msg.from.id;
                //console.log('callback: ', msg)
                const idToDel = msg.data.split('_')[1];
                //console.log('idToDel: '+idToDel)
                bloknotRecord.findOneAndRemove({_id: idToDel}, (err,result) =>{
                    botBloknot.sendMessage(chatId, 'запись удалена');
                })
            })
        })
        .catch((e) => {
            console.log('error', e);
        });