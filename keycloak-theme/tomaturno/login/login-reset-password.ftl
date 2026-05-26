<#import "template.ftl" as layout>
<@layout.registrationLayout displayInfo=true displayMessage=!messagesPerField.existsError('username'); section>

    <#if section = "header"></#if>

    <#if section = "form">
    <div class="tt-wrapper">
        <div class="tt-card">

            <div class="tt-header">
                <div class="tt-brand-icon">&#x1F4E7;</div>
                <div class="tt-title">Recuperar Contraseña</div>
                <div class="tt-subtitle">Ingresa tu usuario y te enviaremos instrucciones</div>
            </div>

            <#if messagesPerField.existsError('username')>
            <div class="tt-error">
                ${kcSanitize(messagesPerField.get('username'))?no_esc}
            </div>
            </#if>

            <form id="kc-reset-password-form" action="${url.loginAction}" method="post">

                <div class="tt-field">
                    <label for="username" class="tt-label">Usuario o Correo</label>
                    <input id="username"
                           name="username"
                           type="text"
                           class="tt-input"
                           placeholder="Código de usuario o correo"
                           value="${(auth.attemptedUsername!'')}"
                           autofocus
                           autocomplete="off" />
                </div>

                <button type="submit" class="tt-btn">Enviar Instrucciones</button>

                <div class="tt-forgot" style="margin-top:1rem; text-align:center;">
                    <a href="${url.loginUrl}">&#x2190; Volver al inicio de sesión</a>
                </div>

            </form>
        </div>
    </div>
    </#if>

</@layout.registrationLayout>
