const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
);

const authPanel = document.getElementById("authPanel");
const accountPanel = document.getElementById("accountPanel");
const adminPanel = document.getElementById("adminPanel");

let loadingAccount = false;

async function register() {
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    const { error } = await supabaseClient.auth.signUp({
        email,
        password
    });

    document.getElementById("authMessage").textContent =
        error ? error.message :
        "Регистрация успешна. Проверьте почту, если требуется подтверждение.";
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
    if (loadingAccount) return;
    loadingAccount = true;

    try {
        adminPanel.classList.add("hidden");
        accountPanel.classList.add("hidden");
        authPanel.classList.remove("hidden");

        document.getElementById("downloadButton").classList.add("hidden");

        const { data: { user }, error: authError } =
            await supabaseClient.auth.getUser();

        if (authError || !user) {
            document.getElementById("status").textContent = "Не авторизован";
            return;
        }

        const { data: profile, error } = await supabaseClient
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .maybeSingle();

        if (error) {
            console.error("Profile error:", error);
            document.getElementById("status").textContent =
                "Ошибка загрузки роли: " + error.message;
            return;
        }

        if (!profile) {
            document.getElementById("status").textContent =
                "Профиль не найден";
            return;
        }

        const role = String(profile.role || "user").toLowerCase();

        authPanel.classList.add("hidden");
        accountPanel.classList.remove("hidden");

        document.getElementById("status").textContent = "Авторизован";
        document.getElementById("accountEmail").textContent = user.email;

        const roleNames = {
            user: "User",
            buyer: "Buyer",
            admin: "Admin"
        };

        document.getElementById("accountRole").textContent =
            roleNames[role] || role;

        if (role === "buyer" || role === "admin") {
            document.getElementById("downloadButton")
                .classList.remove("hidden");
        }

        if (role === "admin") {
            adminPanel.classList.remove("hidden");
        }

        console.log("MARK Injector role:", role);

    } catch (error) {
        console.error(error);
        document.getElementById("status").textContent = error.message;
    } finally {
        loadingAccount = false;
    }
}

async function callAdminFunction(action, email = null) {
    const { data: { session } } =
        await supabaseClient.auth.getSession();

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

supabaseClient.auth.onAuthStateChange(() => {
    setTimeout(() => loadAccount(), 0);
});

loadAccount();
