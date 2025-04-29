// const ENDPOINT = '192.168.86.36'
const ENDPOINT = 'localhost'

document.getElementById('submit-button').addEventListener('click', function(event) {

    event.preventDefault();
    
    const userForm = document.getElementById('user-form').value;
    const passForm = document.getElementById('pass-form').value;
    
    
    fetch('http://' + ENDPOINT + ':3000/login', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                username: userForm,
                password: passForm
            })
          })
          .then(response => response.json())
          .then(data => {
            if(data.success){
                document.cookie.split(";").forEach(cookie => {
                    const name = cookie.split("=")[0].trim();
                    document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;";
                });
                // document.cookie = `username=""; path=/`
                // document.cookie = `password=""; path=/`
                // document.cookie = `teamName=""; path=/`

                    document.cookie = `username=${userForm.toLowerCase()}; path=/`
                    document.cookie = `password=${passForm}; path=/`
                    document.cookie = `teamName=${data.teamName}; path=/`
                    window.location.href = 'http://' + ENDPOINT + ':3000/problem';
                    
                }else{
                    alert(data.message);
                }
            })
            .catch((error) => {
                console.log(error);
                alert("Something Went Wrong");
            });
    

  
    
});
// 

  