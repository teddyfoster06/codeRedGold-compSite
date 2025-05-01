// const ENDPOINT = '192.168.86.36'
const ENDPOINT = 'localhost'
const currentProblemNumber = 1;

const javaEditor = ace.edit("java-editor", {
  mode: "ace/mode/java", 
  theme: "ace/theme/monokai",
  value: "// Write Java code here"
});
const javaEditorRef = document.getElementById('java-editor');

const pythonEditor = ace.edit("python-editor", {
  mode: "ace/mode/python", 
  theme: "ace/theme/monokai",
  value: "// Write python code here lol"
});
const pythonEditorRef = document.getElementById('python-editor');
const sockets = []

const testButtonRef = document.getElementById('testButton');
const submitButtonRef = document.getElementById('submitButton');



const languageSelectorRef = document.getElementById("languages");
let editor = (languageSelectorRef.value === 'python' ? pythonEditor : javaEditor)
let currentLanguage = languageSelectorRef.value;
const endDateArray = [];
let boilerplatePython = "";
let boilerplateJava = "";
const cookies = getCookies();
const saveButtonRef = document.getElementById('save-button');
saveButtonRef.addEventListener('click', function(){
  saveEditor();
});
let timeoutID = 0;

javaEditor.getSession().on('change', () => {
    clearTimeout(timeoutID);
    timeoutID = setTimeout(() => {
      saveEditor();
    }, 2000);
})
pythonEditor.getSession().on('change', () => {
    clearTimeout(timeoutID);
    timeoutID = setTimeout(() => {
      saveEditor();
    }, 2000);
})
  




languageSelectorRef.addEventListener('change', () => {
  saveEditor();
  switch (languageSelectorRef.value) {
    case 'java':
      editor = javaEditor
      javaEditorRef.style.zIndex = 3;
      pythonEditorRef.style.zIndex = 1;
      document.getElementById('editor-loading').style.display = 'flex'
      getValue('java').then(result =>{
        document.getElementById('editor-loading').style.display = 'none'
        editor.setValue(result, -1);
      })
      editor.session.setMode("ace/mode/java");
      break;
    case 'python':
      editor = pythonEditor;
      javaEditorRef.style.zIndex = 1;
      pythonEditorRef.style.zIndex = 3;
      document.getElementById('editor-loading').style.display = 'flex'
      getValue('python').then(result =>{
        document.getElementById('editor-loading').style.display = 'none'
        editor.setValue(result, -1);
      })
      editor.session.setMode("ace/mode/python");
      break;
  }
})

function openTab(event, tabName) {
  const contents = document.querySelectorAll('.tab-content');
  const buttons = document.querySelectorAll('.tab-button');
  
  contents.forEach(content => content.style.display = 'none');
  
  buttons.forEach(button => button.classList.remove('active'));
  
  document.getElementById(tabName).style.display = 'block';
  event.currentTarget.classList.add('active');
  
  
}


document.querySelector('.tab-button.active').click();

document.addEventListener('DOMContentLoaded', function() {

 
  const testcaseRequest = fetch('http://' + ENDPOINT + ':3000/testcases', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
        username: cookies[0],
        password: cookies[1],
        problemNumber: currentProblemNumber
    })
  })
  .then(response => response.json())
  
  
  const descriptionRequest = fetch('http://' + ENDPOINT + ':3000/problem-description?problemNumber=' + currentProblemNumber).then(response => response.json());
  const problemsListRequest = fetch('http://' + ENDPOINT + ':3000/problems-list').then(response => response.json());
  const endTimeRequest = fetch('http://' + ENDPOINT + ':3000/end-time').then(response => response.json());



  Promise.all([testcaseRequest, descriptionRequest, problemsListRequest, endTimeRequest])
  .then(results => {
    const [testcases, description, problemsList, endTime] = results;
    console.log("Here are the results");
    console.log(testcases, description, problemsList);
    handleTestcases(testcases);
    handleProblemsList(problemsList);
    handleProblemDescription(description);
    handleEndtime(endTime)
    getValue(languageSelectorRef.value).then(result =>{
      document.getElementById('editor-loading').style.display = 'none'
      editor.setValue(result, -1);
    })
    
    

  })
  .catch(error => {
    console.error('Error in one of the fetch requests:', error);
  });
});

  

function getCookies(){
  const cookie = document.cookie;
  let current = "";
  let lastWord = "";
  let skipChar = false;
  const cookiesArr = new Array(3).fill("");
  for(let i = 0; i < cookie.length; i++){
    if(cookie.charAt(i) === "="){
      lastWord=current;
      current="";
    }else if(cookie.charAt(i) === ";"){
      skipChar = true;
      if(lastWord==="username"){
        cookiesArr[0] = current;
      }else if(lastWord==="password"){
        cookiesArr[1] = current;
      }else if(lastWord==="teamName"){
        cookiesArr[2] = current;
      }
      current = "";
      lastWord = "";
    }else if(!(skipChar && cookie.charAt(i) === " ")){
      skipChar = false;
      current += cookie.charAt(i);
    }
  }
  if(lastWord==="username"){
    cookiesArr[0] = current;
  }else if(lastWord==="password"){
    cookiesArr[1] = current;
  }else if(lastWord==="teamName"){
    cookiesArr[2] === current;
  }
  return cookiesArr;
}

function handleTestcases(data){
  if(data.success){
    console.log(data.testcases);
    const testcases = data.testcases;
    const table = document.getElementById("table-body");
    let innerHTML = "";
    for(let i = 0; i < testcases.length; i++){
      if(testcases[i]['public']){
        innerHTML += `<tr><td class="thin-column">${i+1}</td><td class="large-column">${testcases[i]['input']}</td><td class="med-column">${testcases[i]['expected-output']}</td><td class="med-column">${testcases[i]['your-output']}</td><td class="status thin-column">${testcases[i]['status'] === 'check' ? ("<span class=\"check\">&#10003;</span") : ("<span class=\"x\">&#10005;</span>")}</td></tr>`
      }else{
        innerHTML += `<tr><td class="thin-column">${i+1}</td><td colspan="3">Hidden Testcase</td><td class="status thin-column">${testcases[i]['status'] === 'check' ? ("<span class=\"check\">&#10003;</span") : ("<span class=\"x\">&#10005;</span>")}</td></tr>`
      }
      
    }
    table.innerHTML = innerHTML;
    console.log(innerHTML);
  }
}

function handleProblemsList(data){
  if(data.success){
    const table = document.getElementById("list-body");
    const list = data.list;
    let innerHTML = "";
    for(let i = 0; i < list.length; i++){
      innerHTML += `<tr onclick="alert('Problem Clicked')" class="problem-list-row"><td><div class="problem-list-entry">#${list[i].number}- ${list[i].title} ● ${list[i].value} pts</div></td></tr>`
    }
    table.innerHTML = innerHTML;
  }
} 

function handleProblemDescription(data){
  if(data.success){
    const table = document.getElementById("description");

    let innerHTML = `<h1>#${data.number}- ${data.title} ● ${data.pointValue} pts</h1>${data.description}`;

    table.innerHTML = innerHTML;
    boilerplateJava = data.javaBoilerplate;
    boilerplatePython = data.pythonBoilerplate;
  }
}

function logData(data){
  fetch('http://' + ENDPOINT + ':3000/log?data='+data)
}
function handleEndtime(data){
  const endDate = new Date(data.endTime);
  const timeRef = document.getElementById('clock');

  setInterval(function() {
    const now = new Date();
    let timeRemaining = endDate - now;
    timeRemaining = Math.floor(timeRemaining / 1000);
    const hours = Math.floor(timeRemaining / 3600);
    timeRemaining = timeRemaining % 3600;
    const minutes = Math.floor(timeRemaining / 60);
    timeRemaining = timeRemaining % 60;
    const seconds = timeRemaining;
    timeRef.innerHTML = (hours > 9 ? hours : ("0" + hours)) + ":" + (minutes > 9 ? minutes : ("0" + minutes)) + ":" + (seconds > 9 ? seconds : ("0" + seconds));

  }, 1000)
}

async function getValue(language){
  const cookies =getCookies();
  const response  = await fetch('http://' + ENDPOINT + ':3000/value-'+language, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
        username: cookies[0],
        password: cookies[1],
        problemNumber: currentProblemNumber
    })
  })
  const result = await response.json();
  
    if(result.success){
      return result.value;
    }else{
      alert("There was an error finding your account. Please log in again.");
    }
  
}

async function saveEditor(){
  fetch('http://' + ENDPOINT + ':3000/updateValue-'+currentLanguage, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
        username: cookies[0],
        password: cookies[1],
        problemNumber: currentProblemNumber,
        newValue: editor.getValue()
    })
})
.then(response => response.json())
.then(result => {
  currentLanguage = languageSelectorRef.value;
})
}

function testCode(code, language, problemNumber){
  const testObject = {
    'code': code,
    'language': language,
    'problemNumber':problemNumber,
    'username': cookies[0],
    'password': cookies[1]
  }
  //Set up websocket and send data
  const socket = new WebSocket('ws://localhost:3001');

  socket.onopen = () => {
    socket.send(JSON.stringify(testObject));
  }
  

  socket.onmessage = (event) => {
    const response = JSON.parse(event.data);
    logData(response);
  }
}

function submitCode(code, language, problemNumber){

}

testButtonRef.addEventListener('click', () => {
  testCode(editor.getValue(), languageSelectorRef.value, currentProblemNumber)
})
submitButtonRef.addEventListener('click', () => {

})


