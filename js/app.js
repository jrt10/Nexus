const loginForm = document.getElementById("loginForm");
const toggleSenha = document.getElementById("toggleSenha");
const senhaInput = document.getElementById("senha");

if (toggleSenha && senhaInput) {
  toggleSenha.addEventListener("click", () => {
    senhaInput.type = senhaInput.type === "password" ? "text" : "password";
  });
}

function normalizarTipo(usuario) {
  return String(usuario?.tipo || "").trim().toLowerCase();
}

function redirecionarUsuario(usuario) {
  const tipo = normalizarTipo(usuario);

  if (usuario.primeiro_acesso || usuario.alterar_senha) {
    window.location.replace("pages/primeiro-acesso.html?v=rotas-master-3");
    return;
  }

  if (["master", "agencia", "contratante"].includes(tipo)) {
    window.location.replace("pages/dashboard-master.html?v=rotas-master-3");
    return;
  }

  if (tipo === "staff") {
    window.location.replace("pages/app-staff.html?v=rotas-master-3");
    return;
  }

  alert("Tipo de usuário não reconhecido.");
}

async function buscarUsuarioLogin(email, senha) {
  const { data, error } = await supabaseClient
    .from("nexus_usuarios")
    .select("*")
    .eq("email", email)
    .eq("senha", senha);

  if (error) {
    throw error;
  }

  if (!data || data.length === 0) {
    return null;
  }

  /*
    Correção importante:
    Se existir mais de um usuário com o mesmo e-mail/senha,
    e o e-mail for o da Jessyca, o sistema SEMPRE escolhe o Master.
    Isso evita cair no app staff por duplicidade/cadastro teste.
  */
  const emailJess = "jessyca.rocha20@gmail.com";

  if (email === emailJess) {
    const master = data.find((item) => normalizarTipo(item) === "master");
    if (master) return master;
  }

  const masterOuAgencia = data.find((item) =>
    ["master", "agencia", "contratante"].includes(normalizarTipo(item))
  );

  return masterOuAgencia || data[0];
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

    let usuario;

    try {
      usuario = await buscarUsuarioLogin(email, senha);
    } catch (error) {
      alert("Erro ao fazer login: " + error.message);
      return;
    }

    if (!usuario) {
      alert("E-mail ou senha inválidos.");
      return;
    }

    const tipo = normalizarTipo(usuario);

    if (usuario.status && !["ativo", "ativa"].includes(String(usuario.status).toLowerCase())) {
      alert("Usuário inativo. Fale com o administrador.");
      return;
    }

    usuario.tipo = tipo;

    localStorage.removeItem("nexus_usuario");
    localStorage.setItem("nexus_usuario", JSON.stringify(usuario));

    await supabaseClient
      .from("nexus_usuarios")
      .update({ ultimo_acesso: new Date().toISOString() })
      .eq("id", usuario.id);

    redirecionarUsuario(usuario);
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
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
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
      .limit(1)
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
      "Solicitação registrada com sucesso.\n\n" +
      "Quando a integração de envio estiver ativa, o link será enviado por " + canal + ".\n\n" +
      "Por segurança, nenhuma senha é exibida na tela."
    );
  });
}
