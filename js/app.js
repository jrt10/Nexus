console.log("Nexus iniciado");

const loginForm = document.getElementById("loginForm");
const senhaInput = document.getElementById("senha");
const toggleSenha = document.getElementById("toggleSenha");

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

                                                                                                                                                                                          alert("Perfil ainda não possui dashboard configurado.");
                                                                                                                                                                                            });
                                                                                                                                                                                            }