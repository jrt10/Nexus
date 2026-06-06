console.log("Nexus iniciado");

const loginForm = document.getElementById("loginForm");
const senhaInput = document.getElementById("senha");
const toggleSenha = document.getElementById("toggleSenha");

if(toggleSenha){
    toggleSenha.addEventListener("click", () => {

        if(senhaInput.type === "password"){
            senhaInput.type = "text";
        } else {
            senhaInput.type = "password";
        }

    });
}

if(loginForm){

    loginForm.addEventListener("submit", function(event){

        event.preventDefault();

        alert("Login do Nexus ainda será conectado ao Supabase.");

    });

}