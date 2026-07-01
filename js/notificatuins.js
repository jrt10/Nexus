/*
  NEXUS V1 - NOTIFICAÇÕES

  O que funciona agora:
  - Permissão de notificação no navegador/celular.
  - Notificação interna no app.
  - Aviso do navegador enquanto o app/PWA está aberto ou ativo.
  - Salva inscrição Push no banco quando a chave VAPID for configurada.

  Para push real com app fechado:
  - Precisa configurar VAPID_PUBLIC_KEY.
  - Precisa deploy da Edge Function em supabase/functions/enviar-push.
  - Precisa agendar/chamar a função para enviar notificações pendentes.
*/

const NEXUS_VAPID_PUBLIC_KEY = "COLE_SUA_CHAVE_PUBLICA_VAPID_AQUI";

function nexusBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

async function nexusRegistrarServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    return null;
  }

  try {
    return await navigator.serviceWorker.register("../service-worker.js?v=nexus-v1-admin-pages-1");
  } catch (error) {
    console.warn("Service worker não registrado:", error);
    return null;
  }
}

function nexusSuportaNotificacao() {
  return "Notification" in window;
}

async function nexusPedirPermissaoNotificacao() {
  if (!nexusSuportaNotificacao()) {
    alert("Este navegador não suporta notificações.");
    return "unsupported";
  }

  if (Notification.permission === "granted") {
    return "granted";
  }

  if (Notification.permission === "denied") {
    alert("As notificações estão bloqueadas no navegador. Ative nas permissões do site.");
    return "denied";
  }

  return await Notification.requestPermission();
}

async function nexusAtivarNotificacoes(usuario, staff) {
  const statusEl = document.getElementById("statusNotificacao");
  const permissao = await nexusPedirPermissaoNotificacao();

  if (statusEl) {
    statusEl.textContent =
      permissao === "granted"
        ? "ativadas"
        : permissao === "denied"
          ? "bloqueadas"
          : "não ativadas";
  }

  if (permissao !== "granted") {
    return false;
  }

  const registration = await nexusRegistrarServiceWorker();

  await nexusSalvarPreferenciaNotificacao(usuario, staff, permissao);

  if (
    registration &&
    "PushManager" in window &&
    NEXUS_VAPID_PUBLIC_KEY &&
    !NEXUS_VAPID_PUBLIC_KEY.includes("COLE_SUA_CHAVE")
  ) {
    try {
      const subscriptionExistente = await registration.pushManager.getSubscription();
      const subscription = subscriptionExistente || await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: nexusBase64ToUint8Array(NEXUS_VAPID_PUBLIC_KEY)
      });

      await nexusSalvarPushSubscription(usuario, staff, subscription);
    } catch (error) {
      console.warn("Push subscription não criada:", error);
    }
  }

  nexusMostrarNotificacaoLocal(
    "Notificações ativadas",
    "Você vai receber avisos de oportunidades enquanto o app estiver ativo."
  );

  return true;
}

async function nexusSalvarPreferenciaNotificacao(usuario, staff, permissao) {
  try {
    await supabaseClient
      .from("nexus_preferencias_notificacao")
      .upsert({
        usuario_id: usuario.id,
        staff_id: staff?.id || usuario.staff_id || null,
        notificacoes_ativas: permissao === "granted",
        permissao_navegador: permissao,
        atualizado_em: new Date().toISOString()
      }, {
        onConflict: "usuario_id"
      });
  } catch (error) {
    console.warn("Preferência de notificação não salva:", error);
  }
}

async function nexusSalvarPushSubscription(usuario, staff, subscription) {
  try {
    const payload = subscription.toJSON();

    await supabaseClient
      .from("nexus_push_subscriptions")
      .upsert({
        usuario_id: usuario.id,
        staff_id: staff?.id || usuario.staff_id || null,
        endpoint: payload.endpoint,
        p256dh: payload.keys?.p256dh || null,
        auth: payload.keys?.auth || null,
        subscription_json: payload,
        user_agent: navigator.userAgent,
        ativo: true,
        updated_at: new Date().toISOString()
      }, {
        onConflict: "endpoint"
      });
  } catch (error) {
    console.warn("Push subscription não salva:", error);
  }
}

function nexusMostrarNotificacaoLocal(titulo, mensagem, urlAlvo = "app-staff.html") {
  if (!nexusSuportaNotificacao() || Notification.permission !== "granted") {
    return;
  }

  try {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        registration.showNotification(titulo || "Nexus", {
          body: mensagem || "",
          icon: "../assets/logo-192.png",
          badge: "../assets/logo-192.png",
          data: {
            url: urlAlvo || "app-staff.html"
          }
        });
      });
    } else {
      const notification = new Notification(titulo || "Nexus", {
        body: mensagem || "",
        icon: "../assets/logo-192.png"
      });

      notification.onclick = () => {
        window.focus();
        if (urlAlvo) window.location.href = urlAlvo;
      };
    }
  } catch (error) {
    console.warn("Notificação local falhou:", error);
  }
}

function nexusIdsNotificacoesMostradas() {
  try {
    return JSON.parse(localStorage.getItem("nexus_notificacoes_mostradas") || "[]");
  } catch {
    return [];
  }
}

function nexusSalvarIdsNotificacoesMostradas(ids) {
  localStorage.setItem("nexus_notificacoes_mostradas", JSON.stringify([...new Set(ids)]));
}

async function nexusBuscarNotificacoesNaoLidas(usuario, limite = 10) {
  const { data, error } = await supabaseClient
    .from("nexus_notificacoes_usuarios")
    .select("*")
    .eq("usuario_id", usuario.id)
    .eq("status", "nao_lida")
    .order("created_at", { ascending: false })
    .limit(limite);

  if (error) {
    console.warn("Erro ao buscar notificações:", error);
    return [];
  }

  return data || [];
}

async function nexusVerificarNovasNotificacoes(usuario, renderCallback) {
  const notificacoes = await nexusBuscarNotificacoesNaoLidas(usuario, 10);
  const jaMostradas = nexusIdsNotificacoesMostradas();
  const novas = notificacoes.filter((item) => !jaMostradas.includes(item.id));

  novas.forEach((item) => {
    nexusMostrarNotificacaoLocal(
      item.titulo || "Nova notificação Nexus",
      item.mensagem || "",
      item.url_alvo || "app-staff.html"
    );
  });

  if (novas.length) {
    nexusSalvarIdsNotificacoesMostradas([...jaMostradas, ...novas.map((item) => item.id)]);
  }

  if (typeof renderCallback === "function") {
    renderCallback(notificacoes);
  }

  return notificacoes;
}

async function nexusMarcarNotificacaoLida(id) {
  await supabaseClient
    .from("nexus_notificacoes_usuarios")
    .update({
      status: "lida",
      data_leitura: new Date().toISOString()
    })
    .eq("id", id);
}

window.nexusAtivarNotificacoes = nexusAtivarNotificacoes;
window.nexusMostrarNotificacaoLocal = nexusMostrarNotificacaoLocal;
window.nexusVerificarNovasNotificacoes = nexusVerificarNovasNotificacoes;
window.nexusMarcarNotificacaoLida = nexusMarcarNotificacaoLida;
