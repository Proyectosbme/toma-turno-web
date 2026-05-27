<#import "template.ftl" as layout>
<@layout.registrationLayout displayMessage=messagesPerField.exists('global'); section>

    <#if section = "header"></#if>

    <#if section = "form">
    <div class="tt-wrapper">
        <div class="tt-card">

            <div class="tt-header">
                <div class="tt-brand-icon">&#x1F464;</div>
                <div class="tt-title">Verificar Perfil</div>
                <div class="tt-subtitle">Completa tu información para continuar</div>
            </div>

            <#if messagesPerField.exists('global')>
            <div class="tt-error">
                ${kcSanitize(messagesPerField.get('global'))?no_esc}
            </div>
            </#if>

            <form id="kc-update-profile-form" action="${url.loginAction}" method="post">

                <#list profile.attributes as attribute>
                    <#if attribute.name != 'locale'>
                    <div class="tt-field">
                        <label for="${attribute.name}" class="tt-label">
                            ${advancedMsg(attribute.displayName!'')}
                            <#if attribute.required><span style="color:#b91c1c"> *</span></#if>
                        </label>
                        <input
                            type="<#if attribute.annotations.inputType??>${attribute.annotations.inputType}<#else>text</#if>"
                            id="${attribute.name}"
                            name="${attribute.name}"
                            value="${(attribute.value!'')}"
                            class="tt-input<#if messagesPerField.existsError('${attribute.name}')> tt-input-error</#if>"
                            <#if attribute.readOnly>disabled</#if>
                            <#if attribute.autocomplete??>autocomplete="${attribute.autocomplete}"</#if>
                            <#if attribute.annotations.inputTypePlaceholder??>placeholder="${advancedMsg(attribute.annotations.inputTypePlaceholder)}"</#if>
                        />
                        <#if messagesPerField.existsError('${attribute.name}')>
                        <div class="tt-field-error">
                            ${kcSanitize(messagesPerField.get('${attribute.name}'))?no_esc}
                        </div>
                        </#if>
                    </div>
                    </#if>
                </#list>

                <button type="submit" class="tt-btn">Guardar y Continuar</button>

            </form>
        </div>
    </div>
    </#if>

</@layout.registrationLayout>
