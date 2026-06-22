console.log("Nexus iniciado");

const loginForm = document.getElementById("loginForm");
const senhaInput = document.getElementById("senha");
const toggleSenha = document.getElementById("toggleSenha");

const btnEsqueciSenha = document.getElementById("btnEsqueciSenha");
const modalSenha = document.getElementById("modalSenha");
const btnFecharSenha = document.getElementById("btnFecharSenha");
const btnCancelarSenha = document.getElementById("btnCancelarSenha");
const btnGerarSenha = document.getElementById("btnGerarSenha");

if (toggleSenha) {
  toggleSenha.addEventListener("click", () => {
    senhaInput.type = senhaInput.type === "password" ? "text" : "password";
  });
}

if (loginForm) {
  loginForm.addEventListener("submit", async function(event) {
    event.preventDefault();

    const email = document.getElementById("email").value.trim().toLowerCase();
    const senha = document.getElementById("senha").value.trim();

    if (!email || !senha) {
      alert("Preencha o e-mail e a senha.");
      return;
    }

    const { data, error } = await supabaseClient
      .from("nexus_usuarios")
      .select("*")
      .eq("email", email)
      .eq("senha", senha)
      .single();

    if (error || !data) {
      alert("E-mail ou senha inválidos.");
      return;
    }

    if (data.status !== "ativo") {
      alert("Usuário inativo ou bloqueado.");
      return;
    }

    localStorage.setItem("nexus_usuario", JSON.stringify(data));

    await supabaseClient
      .from("nexus_usuarios")
      .update({ ultimo_acesso: new Date().toISOString() })
      .eq("id", data.id);

    if (data.primeiro_acesso || data.alterar_senha) {
      window.location.href = "pages/primeiro-acesso.html";
      return;
    }

    if (data.tipo === "master") {
      window.location.href = "pages/dashboard-master.html";
      return;
    }

    if (data.tipo === "agencia") {
      alert("Dashboard da agência será criado no próximo módulo.");
      return;
    }

    if (data.tipo === "contratante") {
      alert("Dashboard do contratante será criado no próximo módulo.");
      return;
    }

    if (data.tipo === "staff") {
      alert("Área do staff/app será criada no próximo módulo.");
      return;
    }

    alert("Perfil não identificado.");
  });
}

function abrirModalSenha() {
  if (!modalSenha) return;
  document.getElementById("emailRedefinir").value = "";
  modalSenha.classList.add("ativo");
}

function fecharModalSenha() {
  if (!modalSenha) return;
  modalSenha.classList.remove("ativo");
}

function gerarSenhaTemporaria() {
  const numero = Math.floor(100000 + Math.random() * 900000);
  return `Nexus@${numero}`;
}

if (btnEsqueciSenha) {
  btnEsqueciSenha.addEventListener("click", abrirModalSenha);
}

if (btnFecharSenha) {
  btnFecharSenha.addEventListener("click", fecharModalSenha);
}

if (btnCancelarSenha) {
  btnCancelarSenha.addEventListener("click", fecharModalSenha);
}

if (btnGerarSenha) {
  btnGerarSenha.addEventListener("click", async () => {
    const email = document.getElementById("emailRedefinir").value.trim().toLowerCase();

    if (!email) {
      alert("Informe o e-mail.");
      return;
    }

    const { data: usuario, error: erroBusca } = await supabaseClient
      .from("nexus_usuarios")
      .select("*")
      .eq("email", email)
      .single();

    if (erroBusca || !usuario) {
      alert("E-mail não encontrado.");
      return;
    }

    const novaSenha = gerarSenhaTemporaria();

    const { error: erroAtualizar } = await supabaseClient
      .from("nexus_usuarios")
      .update({
        senha: novaSenha,
        primeiro_acesso: true,
        alterar_senha: true
      })
      .eq("id", usuario.id);

    if (erroAtualizar) {
      alert("Erro ao redefinir senha: " + erroAtualizar.message);
      return;
    }

    alert(
      `Senha temporária gerada com sucesso!\n\nE-mail: ${email}\nSenha: ${novaSenha}\n\nNo próximo acesso será obrigatório trocar a senha.`
    );

    fecharModalSenha();
  });
}
