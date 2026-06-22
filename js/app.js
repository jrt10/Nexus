const loginForm = document.getElementById("loginForm");
const toggleSenha = document.getElementById("toggleSenha");
const senhaInput = document.getElementById("senha");

if (toggleSenha && senhaInput) {
  toggleSenha.addEventListener("click", () => {
    senhaInput.type = senhaInput.type === "password" ? "text" : "password";
  });
}

function redirecionarUsuario(usuario) {
  if (usuario.primeiro_acesso || usuario.alterar_senha) {
    window.location.href = "pages/primeiro-acesso.html";
    return;
  }

  if (usuario.tipo === "master") {
    window.location.href = "pages/dashboard-master.html";
    return;
  }

  if (usuario.tipo === "agencia") {
    window.location.href = "pages/dashboard-master.html";
    return;
  }

  if (usuario.tipo === "contratante") {
    window.location.href = "pages/dashboard-master.html";
    return;
  }

  if (usuario.tipo === "staff") {
    window.location.href = "pages/app-staff.html";
    return;
  }

  alert("Tipo de usuário não reconhecido.");
}

if (loginForm) {
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value.trim().toLowerCase();
    const senha = document.getElementById("senha").value.trim();

    if (!email || !senha) {
      alert("Preencha e-mail e senha.");
      return;
    }

    const { data, error } = await supabaseClient
      .from("nexus_usuarios")
      .select("*")
      .eq("email", email)
      .eq("senha", senha)
      .maybeSingle();

    if (error) {
      alert("Erro ao fazer login: " + error.message);
      return;
    }

    if (!data) {
      alert("E-mail ou senha inválidos.");
      return;
    }

    if (data.status && !["ativo", "ativa"].includes(data.status)) {
      alert("Usuário inativo. Fale com o administrador.");
      return;
    }

    await supabaseClient
      .from("nexus_usuarios")
      .update({ ultimo_acesso: new Date().toISOString() })
      .eq("id", data.id);

    localStorage.setItem("nexus_usuario", JSON.stringify(data));
    redirecionarUsuario(data);
  });
}

const modalSenha = document.getElementById("modalSenha");
const btnEsqueciSenha = document.getElementById("btnEsqueciSenha");
const btnFecharSenha = document.getElementById("btnFecharSenha");
const btnCancelarSenha = document.getElementById("btnCancelarSenha");
const btnGerarSenha = document.getElementById("btnGerarSenha");

function fecharModalSenha() {
  if (!modalSenha) return;
  modalSenha.classList.remove("ativo");

  const emailRedefinir = document.getElementById("emailRedefinir");
  if (emailRedefinir) emailRedefinir.value = "";
}

function gerarTokenRedefinicao() {
  const parte1 = Math.random().toString(36).slice(2);
  const parte2 = Date.now().toString(36);
  return `${parte1}${parte2}`;
}

if (btnEsqueciSenha && modalSenha) {
  btnEsqueciSenha.addEventListener("click", () => {
    modalSenha.classList.add("ativo");
  });
}

if (btnFecharSenha) btnFecharSenha.addEventListener("click", fecharModalSenha);
if (btnCancelarSenha) btnCancelarSenha.addEventListener("click", fecharModalSenha);

if (btnGerarSenha) {
  btnGerarSenha.addEventListener("click", async () => {
    const email = document.getElementById("emailRedefinir").value.trim().toLowerCase();
    const canal = document.querySelector("input[name='canalRedefinicao']:checked")?.value || "email";

    if (!email) {
      alert("Informe o e-mail.");
      return;
    }

    const { data: usuario, error: erroBusca } = await supabaseClient
      .from("nexus_usuarios")
      .select("id, nome, email")
      .eq("email", email)
      .maybeSingle();

    if (erroBusca) {
      alert("Erro ao buscar usuário: " + erroBusca.message);
      return;
    }

    if (!usuario) {
      alert("E-mail não encontrado.");
      return;
    }

    const token = gerarTokenRedefinicao();
    const expiraEm = new Date(Date.now() + 1000 * 60 * 30).toISOString();

    const { error: erroSolicitacao } = await supabaseClient
      .from("nexus_redefinicoes_senha")
      .insert({
        usuario_id: usuario.id,
        email,
        token,
        status: "pendente",
        expira_em: expiraEm,
        canal_envio: canal
      });

    if (erroSolicitacao) {
      alert("Erro ao registrar solicitação: " + erroSolicitacao.message);
      return;
    }

    fecharModalSenha();

    alert(
      "Solicitação registrada com sucesso.\\n\\n" +
      "Quando a integração de envio estiver ativa, o link será enviado por " + canal + ".\\n\\n" +
      "Por segurança, nenhuma senha é exibida na tela."
    );
  });
}
