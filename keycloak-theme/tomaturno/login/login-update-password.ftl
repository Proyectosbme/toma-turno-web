<#import "template.ftl" as layout>
<@layout.registrationLayout displayMessage=!messagesPerField.existsError('password','password-confirm'); section>

    <#if section = "header"></#if>

    <#if section = "form">
    <div class="tt-wrapper">
        <div class="tt-card">

            <div class="tt-header">
                <div class="tt-brand-icon">&#x1F511;</div>
                <div class="tt-title">Nueva Contraseña</div>
                <div class="tt-subtitle">Elige una contraseña segura para tu cuenta</div>
            </div>

            <#if messagesPerField.existsError('password','password-confirm')>
            <div class="tt-error">
                ${kcSanitize(messagesPerField.getFirstError('password','password-confirm'))?no_esc}
            </div>
            </#if>

            <form id="kc-passwd-update-form" action="${url.loginAction}" method="post">

                <div class="tt-field">
                    <label for="password-new" class="tt-label">Nueva Contraseña</label>
                    <div class="tt-input-wrap">
                        <input id="password-new"
                               name="password-new"
                               type="password"
                               class="tt-input"
                               autofocus
                               autocomplete="new-password" />
                        <span class="tt-eye" onclick="togglePass('password-new', this)">&#xE946;</span>
                    </div>
                </div>

                <div class="tt-field">
                    <label for="password-confirm" class="tt-label">Confirmar Contraseña</label>
                    <div class="tt-input-wrap">
                        <input id="password-confirm"
                               name="password-confirm"
                               type="password"
                               class="tt-input"
                               autocomplete="new-password" />
                        <span class="tt-eye" onclick="togglePass('password-confirm', this)">&#xE946;</span>
                    </div>
                </div>

                <input type="hidden" name="logout-sessions" value="on" />

                <button type="submit" class="tt-btn">Guardar Contraseña</button>

            </form>
        </div>
    </div>

    <script>
        function togglePass(id, eye) {
            const input = document.getElementById(id);
            if (input.type === 'password') {
                input.type = 'text';
                eye.style.opacity = '1';
            } else {
                input.type = 'password';
                eye.style.opacity = '0.5';
            }
        }
    </script>
    </#if>

</@layout.registrationLayout>
