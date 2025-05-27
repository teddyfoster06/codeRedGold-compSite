// const ENDPOINT = '192.168.86.36'
const ENDPOINT = 'localhost'
// const ENDPOINT = '10.58.28.21'

document.getElementById('submit-button').addEventListener('click', function(event) {

    event.preventDefault();
    
    const teamForm = document.getElementById('team-form').value;
    const userForm = document.getElementById('user-form').value;
    const passForm = document.getElementById('pass-form').value;
    const passForm2 = document.getElementById('pass-form2').value;
    
    if(passForm != passForm2){
        alert("Make Sure Your Passwords Match");
    }else{
        fetch('http://' + ENDPOINT + ':3000/register', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                teamName: teamForm,
                username: userForm,
                password: passForm
            })
          })
          .then(response => response.json())
            .then(data => {
                if(data.success){;
                    console.log("Redirecting...")
                    window.location.href = 'http://' + ENDPOINT + ':3000/login';
                }else{
                    alert(data.message);
                }
            })
            .catch((error) => {
                console.log(error);
                alert("Something Went Wrong");
            });
    }

  
    
});
// 

  