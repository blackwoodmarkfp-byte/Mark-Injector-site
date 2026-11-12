const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
);

const authPanel = document.getElementById("authPanel");
const accountPanel = document.getElementById("accountPanel");
const adminPanel = document.getElementById("adminPanel");

async function register() {
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    const { error } = await supabaseClient.auth.signUp({
        email,
        password
    });

    document.getElementById("authMessage").textContent =
        error ? error.message : "Регистрация успешна. Проверьте почту, если требуется подтверждение.";
}

async function login() {
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    const { error } = await supabaseClient.auth.signInWithPassword({
        email,
        password
    });

    if (error) {
        document.getElementById("authMessage").textContent = error.message;
        return;
    }

    await loadAccount();
}

async function logout() {
    await supabaseClient.auth.signOut();
    location.reload();
}

async function loadAccount() {
    const { data: { user } } = await supabaseClient.auth.getUser();

    if (!user) return;

    const { data: profile, error } = await supabaseClient
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    if (error || !profile) {
        alert("Не удалось загрузить профиль");
        return;
    }

    authPanel.classList.add("hidden");
    accountPanel.classList.remove("hidden");

    document.getElementById("status").textContent = "Авторизован";
    document.getElementById("accountEmail").textContent = user.email;
    document.getElementById("accountRole").textContent = profile.role;

    if (profile.role === "buyer" || profile.role === "admin") {
        document.getElementById("downloadButton").classList.remove("hidden");
    }

    if (profile.role === "admin") {
        adminPanel.classList.remove("hidden");
    }
}

async function callAdminFunction(action, email = null) {
    const { data: { session } } = await supabaseClient.auth.getSession();

    if (!session) {
        throw new Error("Необходимо войти в аккаунт");
    }

    const { data, error } = await supabaseClient.functions.invoke(
        "mark-admin",
        {
            body: { action, email }
        }
    );

    if (error) throw error;
    if (data?.error) throw new Error(data.error);

    return data;
}

async function manageBuyer(action) {
    const email = document.getElementById("targetEmail").value.trim();
    const message = document.getElementById("adminMessage");

    if (!email) {
        message.textContent = "Введите email пользователя";
        return;
    }

    try {
        await callAdminFunction(action, email);
        message.textContent = "Операция выполнена";
    } catch (error) {
        message.textContent = error.message;
    }
}

async function downloadInjector() {
    const message = document.getElementById("downloadMessage");

    try {
        const result = await callAdminFunction("download");

        if (!result.url) {
            throw new Error("Ссылка не получена");
        }

        window.location.href = result.url;
        message.textContent = "Ссылка на скачивание создана";
    } catch (error) {
        message.textContent = error.message;
    }
}

supabaseClient.auth.onAuthStateChange((_event, session) => {
    if (session) {
        setTimeout(loadAccount, 0);
    }
});

loadAccount();