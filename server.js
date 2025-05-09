const express = require('express');
const path = require('path');
const fs = require('fs');
const WebSocket = require('ws');
const { register } = require('module');
const app = express();
const PORT = 3000;

const wss = new WebSocket.Server({port:3001});

wss.on('connection', (ws) => {
    ws.on('message', (message) => {
        ws.send("Finding Open Container");
        const requestJSON = JSON.parse(message);
        //1. Find an open container

            if(fileExists(path.join(teamDatasPath, requestJSON['username']+'.json'))){
                if(JSON.parse(readFile(path.join(teamDatasPath, requestJSON['username']+'.json')))['password'] == requestJSON['password']){
                    findOpenContainer(requestJSON['problemNumber'])
                    .then(index => {
                        ws.send("Container found|Running Code");
                        console.log("Logging Relevant Objects:");
                        console.log(index);
                        runDataObjects[index]['code'] = formatCode(requestJSON['code'], requestJSON['problemNumber'], requestJSON['language'], (requestJSON['type'] === 'submit'));
                        sockets[index].onopen = () => {
                            
                            sockets[index].send(runDataObjects[index]['code']);

                        };
                        sockets[index].onmessage = (event) => {
                            if(event.data != "Join Success"){
                                runDataObjects[index]['current-text'] += event.data;
                            }
                            console.log("Event data:");
                        }
                        sockets[index].onclose = (event) => {
                            ws.send("Completed! Please wait for results");
                            console.log("Connection closed: ");
                            
                            console.log(sockets.length);
                            console.log(index);

                            let outputs = runDataObjects[index]['current-text'].split("$$$");
                            const testcaseData = problemsJSON[runDataObjects[index]['problem-number']-1]['testcases'];
                            
                            const teamDataJSON = JSON.parse(readFile(path.join(teamDatasPath, requestJSON['username'].toLowerCase() + '.json')));
                            outputs.shift();
                            console.log("outputs:");
                            console.log(outputs);
                            let correct = 0;
                            let total = 0;
                            let allCorrect;
                            if(requestJSON['type'] === 'submit'){
                                console.log("Type is submit");
                                console.log(outputs);
                                allCorrect = true;
                                for(let i = 0; i < outputs.length && i < testcaseData.length; i++){
                                    console.log(testcaseData[i]['output'] == outputs[i]);
                                    teamDataJSON['problems'][runDataObjects[index]['problem-number']-1]['testcases'][i]['your-output'] = outputs[i];
                                    if(outputs[i] == testcaseData[i]['output']){
                                        teamDataJSON['problems'][runDataObjects[index]['problem-number']-1]['testcases'][i]['status'] = 'check';
                                    }else{
                                        teamDataJSON['problems'][runDataObjects[index]['problem-number']-1]['testcases'][i]['status'] = 'cross';
                                        allCorrect = false;
                                    }
                                }
                                console.log(teamDataJSON['problems'][runDataObjects[index]['problem-number']-1]['testcases']);
                            }else{
                                allCorrect = false;
                                for(let i = 0; i < outputs.length && i < testcaseData.length; i++){
                                    if(testcaseData[i]['public']){
                                        teamDataJSON['problems'][runDataObjects[index]['problem-number']-1]['testcases'][i]['your-output'] = outputs[i];
                                        if(outputs[i] == testcaseData[i]['output']){
                                            teamDataJSON['problems'][runDataObjects[index]['problem-number']-1]['testcases'][i]['status'] = 'check';
                                        }else{
                                            teamDataJSON['problems'][runDataObjects[index]['problem-number']-1]['testcases'][i]['status'] = 'cross';
                                        }
                                    }
                                }
                            }
                            if(allCorrect){
                                teamDataJSON['problems'][runDataObjects[index]['problem-number']-1]['completed'] = "true";
                                const d = new Date();
                                teamDataJSON['problems'][runDataObjects[index]['problem-number']-1]['time-completed'] =d.toISOString();
                                let points = 0;
                                for(let i = 0; i < teamDataJSON['problems'].length; i++){
                                    console.log(teamDataJSON['problems'])
                                    if(teamDataJSON['problems'][i]['completed'] === 'true'){
                                        points += parseInt(problemsJSON[i]['problem-value']);
                                    }
                                }
                                console.log("Points:");
                                console.log(points);
                                teamDataJSON['points'] = points;
                            }

                            
                            
                            
                            console.log("Tried to write the file");
                            writeFile(path.join(teamDatasPath, requestJSON['username'].toLowerCase() + '.json'), JSON.stringify(teamDataJSON, null, 2));
                            runners[runDataObjects[index]['runner-number']]['available'] = true;
                            delete sockets[index];
                            delete runDataObjects[index];
                            console.log(ws.readyState);
                            console.log("Sending done");
                            ws.send("Done.")


                        }
                    });

                    // for(let j = 0; j < activeRunners.length; j++){
                    //     if(activeRunners[j] === true){
                            
                    //         // checkIfOpen(j, requestJSON['problemNumber'])
                            
                    //     }
                    // }

                }else{
                    ws.close(1008, "Bad Password");
                }
            }else{
                ws.close(1008, "Bad Username");
            }
        

        

        //2.Create Code
        
        
        //3. Send Code
        
        //4. On response, compare output to testcases
        //5. Send new testcases back to the client
    })
    ws.on('close', () =>{
        console.log('client disconnected');
    })
})

const teamsPath = path.join(__dirname, 'database', 'teams.json');
const teamDatasPath = path.join(__dirname, 'database', 'teamDatas');
const problemsPath = path.join(__dirname, 'database', 'problems.json');
const compInfoPath = path.join(__dirname, 'database', 'compInfo.json');
const registeredRunnersPath = path.join(__dirname, 'database', 'registeredRunners.json');
const problemsJSON = JSON.parse(readFile(problemsPath));
const compInfoJSON = JSON.parse(readFile(compInfoPath));

const runners = [];



// Middleware to parse JSON request bodies
app.use(express.json());

app.post('/points', (req, res) => {
    console.log("Recieved points request");
    const {username} = req.body;
    console.log(username);
    try{

        console.log("Pointss: "+JSON.parse(readFile(path.join(teamDatasPath, username.toLowerCase()+'.json')))['points']);
        res.status(200).json({points: JSON.parse(readFile(path.join(teamDatasPath, username.toLowerCase()+'.json')))['points']});
    }catch(error){
        console.log(error);
    }
    
});






app.get('/log', (req, res) => {
    const {data} = req.query;
    console.log("Client Log:")
    console.log(data);
    res.status(200).json({});
})

app.get('/register-runner', (req, res) => {
    console.log("Request recieved");
    let ip = req.ip;
    if(ip.startsWith('::ffff:')){
        ip=ip.substring(7);
    }
    let runnersJSON = JSON.parse(readFile(registeredRunnersPath));
    for(let i = 0; i < runnersJSON.length; i++){
        if(runnersJSON[i]['ip'] === ip){
            console.log("Failure!")
            res.status(401).json({success: false, message: "ip already registered"});
            return;
        }
    }
    runnersJSON.push({"ip":ip});
    runners.push({ip: ip, available: true});
    writeFile(registeredRunnersPath, JSON.stringify(runnersJSON, null, 2))
    console.log("Success!")
    res.status(200).json({success: true});

})

// Serve static files (JS, CSS)
app.use(express.static('public'));

// HTML Page Route
app.get('/problem', (req, res) => {
    res.sendFile(path.join(__dirname, 'pages/problem.html'));
});
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'pages/login.html'));
});

app.get('/signup', (req, res) => {
    res.sendFile(path.join(__dirname, 'pages/signup.html'));
});
app.get('/end-time', (req, res) => {
    res.status(200).json({endTime: compInfoJSON['end-time']});
})

app.get('/problem-description', (req, res) => {
    const {problemNumber} = req.query;
    try{
        res.status(200).json({success: true, description: problemsJSON[problemNumber-1]['problem-description'], title: problemsJSON[problemNumber-1]['problem-title'], pointValue: problemsJSON[problemNumber-1]['problem-value'], number: parseInt(problemNumber), pythonBoilerplate: problemsJSON[problemNumber-1]['boilerplate-python'], javaBoilerplate: problemsJSON[problemNumber-1]['boilerplate-java']});
    }catch(error){
        res.status(404).json({success: false});
    }
})

app.get('/problems-list', (req, res) => {
    const problemsList = [];

    for(let i = 0; i < problemsJSON.length; i++){
        problemsList.push({title: problemsJSON[i]['problem-title'], number: i+1, value: problemsJSON[i]['problem-value']})
    }
    res.status(200).json({success: true, list: problemsList});
})


app.post("/value-java", (req, res) => {
    const {username, password, problemNumber} = req.body;
    const filePath = path.join(teamDatasPath, username.toLowerCase() + '.json');

    if (fileExists(filePath)) {
        const userDataJSON = JSON.parse(readFile(filePath));
        if (userDataJSON['password'] === password) {
            const problemData = userDataJSON['problems'];
            console.log(problemData);
            res.status(200).json({ success: true, value: problemData[problemNumber-1]['value-java'] });
            return;
        } else {
            res.status(401).json({ success: false, message: 'Bad Password' });
            return;
        }
    }

    res.status(401).json({ success: false, message: 'Username not recognized' });
});

app.post("/value-python", (req, res) => {
    const {username, password, problemNumber} = req.body;
    const filePath = path.join(teamDatasPath, username.toLowerCase() + '.json');

    if (fileExists(filePath)) {
        const userDataJSON = JSON.parse(readFile(filePath));
        if (userDataJSON['password'] === password) {
            const problemData = userDataJSON['problems'];
            res.status(200).json({ success: true, value: problemData[problemNumber-1]['value-python'] });
            return;
        } else {
            res.status(401).json({ success: false, message: 'Bad Password' });
            return;
        }
    }

    res.status(401).json({ success: false, message: 'Username not recognized' });
});



app.post('/register', (req, res) => {
    const {teamName, username, password} = req.body;
    console.log(`Register request: ${teamName}, ${username}, ${password}`);

    let teamsJSON = JSON.parse(readFile(teamsPath));

    for(let i = 0; i < teamsJSON.length; i++){
        if(teamsJSON[i]['team-name'].toLowerCase() == teamName.toLowerCase()){
            res.status(401).json({ success: false, message: 'Team Name Taken' });
            console.log("Team Name Taken");
            return;
        }else if(teamsJSON[i]['username'] == username.toLowerCase()){
            res.status(402).json({ success: false, message: 'Username Taken' });
            console.log("Username Taken");
            return;
        }
    }
    const newTeamObject = {
        "team-name": teamName,
        "username": username.toLowerCase(),
        "password": password
    }
    teamsJSON.push(newTeamObject);

    writeFile(teamsPath, JSON.stringify(teamsJSON, null, 2))
    
    writeFile(path.join(teamDatasPath, username.toLowerCase()+'.json'), JSON.stringify({
        "username": username.toLowerCase(),
        "password": password,
        "points": 0,
        "problems":generateUserProblemsArray()
    }, null, 2))

    res.status(200).json({ success: true, message: 'Team Added' });

});

app.post('/testcases', (req, res) => {
    const {username, password, problemNumber} = req.body;
    console.log(`Testcase request: ${username}, ${password}, ${problemNumber}`);

    let filePath = path.join(teamDatasPath, username.toLowerCase()+'.json');
    console.log(filePath);
    if(fileExists(filePath)){
        let userDataJSON = JSON.parse(readFile(filePath));
        console.log(password);
        console.log(userDataJSON['password']);
        if(userDataJSON['password'] === password){
            console.log("sending tescases");
            const problem = userDataJSON['problems'][problemNumber-1];
            res.status(200).json({success: true, testcases: problem['testcases'], message: 'Testcases sent'});
            return;
        }else{
            res.status(401).json({success: false, message: 'Bad Password'});
            return
        }
    }
    res.status(401).json({ success: false, message: 'Username not recognized'});    
});



app.post('/login', (req, res) => {
    const {username, password} = req.body;

    let teamsJSON = JSON.parse(readFile(teamsPath));

    for(let i = 0; i < teamsJSON.length; i++){
        if(teamsJSON[i]['username'] == username.toLowerCase()){
            if(teamsJSON[i]['password'] == password){
                res.status(200).json({ success: true, message: 'Signed In', teamName: teamsJSON[i]['team-name']});

                return;
            }
            res.status(401).json({ success: false, message: 'Bad Password'});

            return;
        }
    }

    res.status(402).json({ success: false, message: 'Username not found'});

})



app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

function generateUserProblemsArray(){
    problemsArray = [];
    for(let i = 0; i < problemsJSON.length; i++){
        problemObject = {
            "completed": "false",
            "time-completed": "00:00:00",
            "number": problemsJSON[i]['problem-number'],
            "value-java": problemsJSON[i]['boilerplate-java'],
            "value-python": problemsJSON[i]['boilerplate-python'],
            "testcases": []
        }
        for(let j = 0; j<problemsJSON[i]["testcases"].length; j++){
            testcase = problemsJSON[i]["testcases"][j]
            if(testcase["public"]){
                let input = "";
                for(let k = 0; k < problemsJSON[i]["inputs"].length; k++){
                    const varName = problemsJSON[i]["inputs"][k]['python'];
                    input+= varName;
                    input+= "=";
                    input+=testcase[varName];
                    input+="\n";
                }
                input=input.substring(0, input.length-1);
                problemObject['testcases'].push(
                    {
                        'public': true,
                        'input': input,
                        'expected-output': testcase['output'],
                        'your-output': "",
                        'status': 'cross'
                    }
                )
            }else{
                problemObject['testcases'].push(
                    {
                        'public': false,
                        'status': 'cross'
                    }
                )
            }
        }
        problemsArray.push(problemObject)
    }
    
    return problemsArray;
}


app.post("/updateValue-java", (req, res) => {
    const {username, password, problemNumber, value} = req.body;
   
    const filePath = path.join(teamDatasPath, username.toLowerCase() + '.json');

    if (fileExists(filePath)) {
        const userData = JSON.parse(readFile(filePath));
        if (userData.password === password) {
            userData.problems[problemNumber - 1]['value-java'] = value;
            writeFile(filePath, JSON.stringify(userData, null, 2));
            res.status(200).json({ success: true, message: 'Java value updated' });
        } else {
            res.status(401).json({ success: false, message: 'Bad Password' });
        }
    } else {
        res.status(401).json({ success: false, message: 'Username not recognized' });
    }
});
app.post("/updateValue-python", (req, res) => {
    const {username, password, problemNumber, value} = req.body;
   
    const filePath = path.join(teamDatasPath, username.toLowerCase() + '.json');

    if (fileExists(filePath)) {
        const userData = JSON.parse(readFile(filePath));
        if (userData.password === password) {
            userData.problems[problemNumber - 1]['value-python'] = value;
            writeFile(filePath, JSON.stringify(userData, null, 2));
            res.status(200).json({ success: true, message: 'Java value updated' });
        } else {
            res.status(401).json({ success: false, message: 'Bad Password' });
        }
    } else {
        res.status(401).json({ success: false, message: 'Username not recognized' });
    }
});



app.use((req, res) => {
    res.status(404).send('Not found');
  });

const activeRunners = new Array(JSON.parse(readFile(registeredRunnersPath)).length).fill(true);
const runnersJSON = JSON.parse(readFile(registeredRunnersPath));

//socket, Runner number, current text, problem number
const runDataObjects = [];
const sockets = [];



function formatCode(code, problemNumber, language, isSubmission){
    let index;
    if(language == 'java'){

        let printerFunctionName;
        let insert = ""
        if(problemsJSON[problemNumber-1]['has-customPrinterFunction']){
            printerFunctionName = problemsJSON[problemNumber-1]['customPrinterFunctions']['name']
            insert += "\n"+problemsJSON[problemNumber-1]['customPrinterFunctions']['java'];
            insert += "\n";
        }else{
            printerFunctionName = "System.out.print"
        }
        insert+="public static void main(String[] args){\n"

        const testcases = problemsJSON[problemNumber-1]['testcases'];
        const inputs = problemsJSON[problemNumber-1]['inputs'];
        for(let j = 0; j < testcases.length; j++){
            if(isSubmission || testcases[j]['public']){
            const inputNames = [];
            for(let k = 0; k < inputs.length; k++){
                inputNames.push(inputs[k]['python'] + '' + j);
                insert+=inputs[k]['java'] + '' + j + ' = ' + testcases[j][inputs[k]['python']] + ';\n';
            }
            insert+="System.out.print(\"$$$\");\n";
            insert+=printerFunctionName+"("+problemsJSON[problemNumber-1]['method-name']+'(';
            for(let k = 0; k < inputNames.length; k++){
                insert+=inputNames[k]+',';
            }
            insert = insert.substring(0, insert.length-1);
            insert+='));\n';
        }
        }
        for(let j = code.length; j > -1; j--){
            if(code.charAt(j) == '}'){
                code = code.substring(0, j) + insert + "}\n" + code.substring(j);
                code = 'java-'+code;
                break;
            }
        }
    }else{
        let printerFunctionName;
        let insert = "\n"
        if(problemsJSON[problemNumber-1]['has-customPrinterFunction']){
            printerFunctionName = problemsJSON[problemNumber-1]['customPrinterFunctions']['name']
            insert += "\n"+problemsJSON[problemNumber-1]['customPrinterFunctions']['python'];
            insert += "\n";
        }else{
            printerFunctionName = "print"
        }

        const testcases = problemsJSON[problemNumber-1]['testcases'];
        const inputs = problemsJSON[problemNumber-1]['inputs'];
        for(let j = 0; j < testcases.length; j++){
            if(isSubmission || testcases[j]['public']){
            const inputNames = [];
            for(let k = 0; k < inputs.length; k++){
                inputNames.push(inputs[k]['python'] + '' + j);
                insert+=inputs[k]['python'] + '' + j + ' = ' + testcases[j][inputs[k]['python']].replace(/{/g, "[").replace(/}/g, "]") + ';\n';
            }
            insert+="print(\"$$$\");\n";
            insert+=printerFunctionName+"("+problemsJSON[problemNumber-1]['method-name']+'(';
            for(let k = 0; k < inputNames.length; k++){
                insert+=inputNames[k]+',';
            }
            insert = insert.substring(0, insert.length-1);
            insert+='));\n';
        }
        }
        code = 'python-'+code + insert
        
    }
    console.log("Formatted:");
    console.log(code);
    return code;
}


function writeFile(path, data){
    return fs.writeFileSync(path, data)
}

function readFile(path){
    return fs.readFileSync(path, 'utf8')
}

function fileExists(path){
    return fs.existsSync(path);
}

async function findOpenContainer(problemNumber){
    const controllers = [];
    const fetchPromises = [];

    for(let i = 0; i < runners.length; i++){
        let fetchPromise;
        console.log("runners:");
        console.log(runners);
        if(!runners[i]['available']){
            fetchPromise = Promise.resolve(null); 
        }else{
            const controller = new AbortController();
            controllers.push(controller);
    
            fetchPromise = fetch('http://'+runners[i]['ip']+':3080/is-occupied', { signal: controller.signal })
            .then(async (response) => {
                const result = await response.text();
    
                if (result === "false") {
                    for (let ctrl of controllers) {
                      ctrl.abort();
                    }
                    return i;
                  }
                  return null;
            })
            .catch((error) => {
                if (error.name === 'AbortError') {
                return null;
                }
                console.error('Request failed:', error);
               
            });
        }
        
        fetchPromises.push(fetchPromise);

    }

    
    const results = await Promise.all(fetchPromises);

    const validResults = results.filter(result => result !== null);

    if (validResults.length > 0) {
        console.log("First valid response:", validResults[0]);
        const i = validResults[0];
        runners[i]['available'] = false;
        pushToFirstEmptySlot(sockets, new WebSocket('ws://'+runnersJSON[i]['ip']+':3080'))
        const k = pushToFirstEmptySlot(runDataObjects, {
            "runner-number": i,
            "current-text": "",
            "code": "",
            "problem-number": parseInt(problemNumber),
            "ip": runners[i]['ip']          
        })
        return k;
    } else {
        console.log("No valid responses.");
        return null;
    }

}

async function doPreFlightChecks(){
    const registeredRunners = JSON.parse(readFile(registeredRunnersPath));
    const ips = [];
    const newIps = [];
    for(let i =0; i < registeredRunners.length; i++){
        ips.push(registeredRunners[i]['ip']);
    }
    const fetchWithTimeout = (ip, timeout = 3000) => {
        const url = 'http://'+ip+':3080/is-occupied'
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
      
        return fetch(url, { signal: controller.signal })
          .then(() => ip)
          .catch(error => {
           
          })
          .finally(() => clearTimeout(timeoutId));
      };
      
      // Function to fetch all URLs and process the successful ones
      
        try {
          const promises = ips.map(ip => fetchWithTimeout(ip));
          const results = await Promise.all(promises);
          results.forEach(ip => {
            if(ip != undefined){
                console.log("ip: " + ip);
                runners.push({ip: ip, available: true});
                newIps.push({ip: ip});
            }
            
          });
      
        } catch (error) {
          console.error('Error or timeout occurred:', error);
        }

        writeFile(registeredRunnersPath, JSON.stringify(newIps, null, 2));
      
}
doPreFlightChecks();

// async function checkIfOpen(i, problemNumber){
//     try{
//     if(i > activeRunners.length){
//         console.log("There are no open runners");
//         return -1;
//     }
//     if(activeRunners[i] === true){
//         let response = await fetch('http://'+runnersJSON[i]['ip']+':3080/is-occupied')
//         response = await response.text();
//             console.log(response, " ", activeRunners[i]);
//             if(response === 'false'){
//                 if(activeRunners[i] === true){
//                     
//                 }else{
//                     for(let j = 0; j < activeRunners.length; j++){
//                         if(activeRunners[j] === true){
//                             return checkIfOpen(j, problemNumber);
//                         }
//                     }
//                     return false;
//                 }
//             }else{
//                 for(let j = 0; j < activeRunners.length; j++){
//                     if(activeRunners[j] === true){
//                         return checkIfOpen(j, problemNumber);
//                     }
//                 }
//                 return false;
//             }
        
//     }else{
//         for(let j = 0; j < activeRunners.length; j++){
//             if(activeRunners[j] === true){
//                 return checkIfOpen(j, problemNumber);
//             }
//         }
//         return false;
//     }
// }catch(error){
//     for(let j = 0; j < activeRunners.length; j++){
//         if(activeRunners[j] === true){
//             return checkIfOpen(j, problemNumber);
//         }
//     }
//     return false;
// }
    
// }
function pushToFirstEmptySlot(arr, value) {
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] === undefined) {
      arr[i] = value;  // Fill the first empty slot
      return i;
    }
  }
  // If no empty slot found, push to the end
  arr.push(value);
  return arr.length-1;
}



