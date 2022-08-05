const http = require('http');
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');

const expressSession = require('express-session');

const multer = require('multer');
const fs = require('fs');
const cookieParser = require('cookie-parser');
const cors = require('cors');

var multipart = require('connect-multiparty');
var multipartMiddleware = multipart();

var app = express();

app.use(multipart({uploadDir: __dirname+'/files'}));

app.set('port', process.env.PORT || 3000);

app.use(express.urlencoded({extended: true}));
app.use(express.json());

// Static 폴더 설정
app.use('/', express.static(path.join(__dirname, 'public')));
app.use('/files', express.static(path.join(__dirname, 'files')));
app.use('/results', express.static(path.join(__dirname, 'results')));

// 쿠키 및 세션 설정
app.use(cookieParser());

app.use(expressSession({
    secret: 'my key',
    resave: true,
    saveUninitialized: true
}));

app.use(cors());

var router = express.Router();

router.route('/file/upload').post(multipartMiddleware, function(req, res) {
	console.log('/file/upload 호출됨');
	
	var file = req.files.file; //  '요청메세지'.'files'.'폼태그input name 키값' 
	// console.log(file);
	var type = file.type; // image인지 application 인지 파일의 타입을 확인가능.
	var name = file.name //업로드하는 파일의 파일명.확장자 확인
	var path = file.path;
	var filePath = __dirname+'/files/'+name; // 저장할 파일명 지정.
	fs.rename(path,filePath,function(err){ 
		// res.send({'code': '0000'});
	
		// 채팅 분석
		fs.readFile(filePath, 'utf8', (err, data) => {
			if (err) {
				res.send({
					'code': 'err',
					'result': err
				});
				return;
			}
			
			var lines = data.toString().split("\n");
			
			var chatRoomName = lines[0].slice(0, lines[0].indexOf('님과 카카오톡 대화'));
			var saveDate = lines[1].slice(9);
			// console.log(chatRoomName);
			// console.log(saveDate);
			
			var result = {
				code: 'success',
				result: {
					chattingRoom: {
						name: chatRoomName,
						saveDate: saveDate
					},
					people: []
				}
			}
			// person: Object
			// name, count, lastChatDate, enterDate, leftDate
				
			var date = '';
			
			for (var i = 2; i < lines.length; i++) {
				var line = lines[i];
				
				var isChat = (line[0] === '[');
				var isEnter = (line.indexOf('님이 들어왔습니다.') != -1);
				var isLeft = (line.indexOf('나갔습니다') != -1);
				var isDateLine = (line.indexOf('---------------') != -1);
				
				if(isChat) {
					// console.log(line);
					var name = line.slice(1, line.indexOf(']'));
					var time = line.slice(line.indexOf('[', 1) + 1, line.indexOf(']', line.indexOf(']') + 1));
					if (!time.includes('오후') && !time.includes('오전')) {
						time = line.slice(line.lastIndexOf('[') + 1, line.lastIndexOf(']'));
					}
					// var chat = line.slice(line.indexOf(']', line.indexOf(']') + 1) + 2);
					var existPerson = false;
					result.result.people.forEach(person => {
						if(person.name == name) {
							person.count++;
							person.lastChatDate = {date: date, time: time};
							existPerson = true;
						}
					});
					if(!existPerson) {
						result.result.people.push({
							name: name,
							count: 0,
							lastChatDate: {
								date: null,
								time: ''
							},
							enterDate: '',
							leftDate: ''
						});
					}
				} else if (isDateLine) {
					var endDateLine = line.indexOf('일')
					date = line.slice(16, endDateLine + 1);
					var dateFormat = date.replace(' ', '').replace('년','-').replace('월','-').replace('일','-');
					date = new Date(dateFormat);
				} else if (isLeft) {
					// console.log(date);
					var name = line.slice(0, line.indexOf('님이 나갔습니다.'));
					// console.log(`'${name}'이/가 나간 날짜 : ${date}`);
					var existPerson = false;
					result.result.people.forEach(person => {
						if(person.name == name) {
							person.leftDate = date;
							existPerson = true;
						}
					});
					if(!existPerson) {
						result.result.people.push({
							name: name,
							count: 0,
							lastChatDate: {
								date: null,
								time: ''
							},
							enterDate: '',
							leftDate: date
						});
					}
				} else if (isEnter) {
					var name = line.slice(0, line.indexOf('님이 들어왔습니다.'));
					// console.log(`'${name}'이/가 들어온 날짜 : ${date}`);
					result.result.people.push({
						name: name,
						count: 0,
						lastChatDate: {
							date: null,
							time: ''
						},
						enterDate: date,
						leftDate: ''
					});
				}
			}
			var jsonFile = __dirname + '/results/' + chatRoomName + '_' + saveDate + '.json';
			fs.writeFile(jsonFile, JSON.stringify(result), (error) => {
				if (error) {
					res.send({
						'code': 'err',
						'result': err
					});
					return;
				}
				res.send(result);
			});
		});
	});
});

router.route('/file/analysis').get(function(req, res) {
    var filename = req.body.filename || req.query.filename;

    fs.readFile('/files/'+filename, 'utf8', (err, data) => {
		if (err) {
			// Log 파일에 에러 작성
			console.log(err)
		}
		
		var lines = data.toString().split("\n");
		
		for(let i = 0; i < 10; i++) {
			console.log(lines[i]);
		}
	});
});

app.use('/', router);

http.createServer(app).listen(app.get('port'), function() {
    console.log('Server Started at %d...', app.get('port'));
});