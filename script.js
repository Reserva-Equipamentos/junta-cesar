// CONFIGURAÇÃO DO FIREBASE
const firebaseConfig = {
    apiKey: "AIzaSyDQkyKieKA3qir6_7aShEPXf3Nvbqf5G_g",
    authDomain: "agenda-equipamentos-65173.firebaseapp.com",
    projectId: "agenda-equipamentos-65173",
    storageBucket: "agenda-equipamentos-65173.firebasestorage.app",
    messagingSenderId: "582099907602",
    appId: "1:582099907602:web:f91f6e9a944727453f14cb",
    measurementId: "G-B42WJZ4M74",
    databaseURL: "https://agenda-equipamentos-65173-default-rtdb.europe-west1.firebasedatabase.app/"
};

// Inicializar Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.database();

const EMAIL_CORRETO = "junta.cesar@outlook.pt";
const PASS_CODIFICADA = "NTUwMDE1SmYq";
let reservasAtivas = [];

// CARREGAR DADOS DA NUVEM EM TEMPO REAL
function carregarDados() {
    db.ref('reservas').on('value', (snapshot) => {
        const dados = snapshot.val();
        reservasAtivas = [];
        if (dados) {
            Object.keys(dados).forEach(id => {
                reservasAtivas.push({ idFirebase: id, ...dados[id] });
            });
        }
        verificarDisponibilidade();
        renderizarHistorico();
    });
}

carregarDados();

// LOGIN
document.getElementById('loginForm').addEventListener('submit', function(e) {
    e.preventDefault();
    if (document.getElementById('loginEmail').value === EMAIL_CORRETO && btoa(document.getElementById('loginPass').value) === PASS_CODIFICADA) {
        document.getElementById('loginSection').style.display = 'none';
        document.getElementById('reservaSection').style.display = 'block';
    } else {
        document.getElementById('loginErro').style.display = 'block';
    }
});

function alternarVista(vista) {
    const cont = document.getElementById('mainContainer');
    if (vista === 'agenda') {
        document.getElementById('vistaAgenda').style.display = 'block';
        document.getElementById('vistaHistorico').style.display = 'none';
        document.getElementById('btnAgenda').classList.add('active');
        document.getElementById('btnHistorico').classList.remove('active');
        cont.classList.remove('wide');
    } else {
        document.getElementById('vistaAgenda').style.display = 'none';
        document.getElementById('vistaHistorico').style.display = 'block';
        document.getElementById('btnAgenda').classList.remove('active');
        document.getElementById('btnHistorico').classList.add('active');
        cont.classList.add('wide');
        renderizarHistorico();
    }
}

function verificarDisponibilidade() {
    const data = document.getElementById('checkData').value;
    const equip = document.getElementById('checkEquipamento').value;
    const painel = document.getElementById('statusPainel');
    if (!data) return;

    const ocupado = reservasAtivas.find(r => r.data === data && r.equipamento === equip);

    if (ocupado) {
        painel.className = "status-box ocupado";
        painel.innerHTML = `❌ OCUPADO<br><small>Evento: ${ocupado.evento || 'Não Especificado'}<br>Reservado para: ${ocupado.nome} (${ocupado.contacto})</small>`;
        document.getElementById('formularioReserva').style.display = 'none';
    } else {
        painel.className = "status-box disponivel";
        painel.innerHTML = `✅ LIVRE / DISPONÍVEL<br><button onclick="abrirForm('${data}', '${equip}')" style="background:var(--accent); color:white; border:none; padding:8px 15px; border-radius:8px; cursor:pointer; margin-top:10px;">Marcar Seleção</button>`;
    }
}

function adicionarNovaLinhaData(valorData = "") {
    const container = document.getElementById('containerListaDias');
    if (!container) return;
    
    const divLinha = document.createElement('div');
    divLinha.className = "linha-dia-btn";
    divLinha.style.marginBottom = "5px";
    divLinha.innerHTML = `
        <input type="date" class="input-data-multipla" value="${valorData}" required style="margin: 0; width: 100%;">
        <button type="button" onclick="this.parentElement.remove()" style="background:#e53e3e; color:white; border:none; border-radius:8px; padding:0 15px; cursor:pointer; height:40px; font-weight:bold;">✕</button>
    `;
    container.appendChild(divLinha);
}

function abrirForm(data, equip, idFirebase = -1) {
    const formDiv = document.getElementById('formularioReserva');
    formDiv.style.display = 'block';
    document.getElementById('editIndex').value = idFirebase;
    
    document.getElementById('containerListaDias').innerHTML = "";
    const checkboxes = document.querySelectorAll('#listaCheckboxesEquipamentos input[type="checkbox"]');
    checkboxes.forEach(cb => cb.checked = false);

    if (idFirebase !== -1) {
        document.getElementById('containerMultiplosCampos').style.display = 'none';
        const res = reservasAtivas.find(r => r.idFirebase === idFirebase);
        document.getElementById('tituloForm').innerText = "Editar Marcação";
        document.getElementById('evento').value = res.evento || "";
        document.getElementById('nome').value = res.nome;
        document.getElementById('contacto').value = res.contacto;
        document.getElementById('hora').value = res.hora;
        document.getElementById('horaFim').value = res.horaFim || "";
        document.getElementById('obs').value = res.obs || "";
        document.getElementById('btnConfirmarForm').innerText = "Atualizar Dados";
    } else {
        document.getElementById('containerMultiplosCampos').style.display = 'block';
        document.getElementById('tituloForm').innerText = "Nova Marcação Múltipla";
        document.getElementById('reservaForm').reset();
        
        checkboxes.forEach(cb => {
            if (cb.value === equip) cb.checked = true;
        });
        
        adicionarNovaLinhaData(data);
        document.getElementById('btnConfirmarForm').innerText = "Confirmar e Gravar Tudo";
    }
}

document.getElementById('reservaForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const idFirebase = document.getElementById('editIndex').value;
    
    const eventoInput = document.getElementById('evento').value;
    const nomeInput = document.getElementById('nome').value;
    const contactoInput = document.getElementById('contacto').value;
    const horaInput = document.getElementById('hora').value;
    const horaFimInput = document.getElementById('horaFim').value;
    const obsInput = document.getElementById('obs').value;

    if (idFirebase !== "-1") {
        const resAntiga = reservasAtivas.find(r => r.idFirebase === idFirebase);
        const dados = {
            evento: eventoInput,
            nome: nomeInput,
            contacto: contactoInput,
            equipamento: resAntiga.equipamento,
            data: resAntiga.data,
            hora: horaInput,
            horaFim: horaFimInput,
            obs: obsInput 
        };
        db.ref('reservas/' + idFirebase).set(dados);
    } else {
        const checkboxes = document.querySelectorAll('#listaCheckboxesEquipamentos input[type="checkbox"]');
        let locaisSelecionados = [];
        checkboxes.forEach(cb => {
            if (cb.checked) locaisSelecionados.push(cb.value);
        });

        const inputsData = document.querySelectorAll('.input-data-multipla');
        let datasSelecionadas = [];
        inputsData.forEach(input => {
            if (input.value) datasSelecionadas.push(input.value);
        });

        if (locaisSelecionados.length === 0 || datasSelecionadas.length === 0) {
            alert("Por favor, selecione pelo menos um Equipamento e uma Data.");
            return;
        }

        locaisSelecionados.forEach(local => {
            datasSelecionadas.forEach(data => {
                const dadosCombina = {
                    evento: eventoInput,
                    nome: nomeInput,
                    contacto: contactoInput,
                    equipamento: local,
                    data: data,
                    hora: horaInput,
                    horaFim: horaFimInput,
                    obs: obsInput
                };
                db.ref('reservas').push(dadosCombina);
            });
        });
    }

    alert("Operação realizada com sucesso!");
    document.getElementById('formularioReserva').style.display = 'none';
    verificarDisponibilidade();
});

function renderizarHistorico() {
    const corpo = document.getElementById('corpoTabela');
    if (!corpo) return;
    corpo.innerHTML = "";

    const filtro = document.getElementById('filtroEquipamento').value;

    let ordenadas = [...reservasAtivas].sort((a, b) => new Date(a.data) - new Date(b.data));

    if (filtro !== "Todos") {
        ordenadas = ordenadas.filter(res => res.equipamento === filtro);
    }

    if (ordenadas.length === 0) {
        corpo.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:20px;">Nenhuma reserva encontrada para este filtro.</td></tr>`;
        return;
    }

    ordenadas.forEach((res) => {
        const hFim = res.horaFim ? ` às ${res.horaFim}` : "";
        const evtNome = res.evento ? res.evento : `<span style="color:#cbd5e0; font-style:italic;">Não definido</span>`;
        const obsTexto = res.obs ? res.obs : `<span style="color:#cbd5e0; font-style:italic;">Sem notas</span>`;
        
        corpo.innerHTML += `<tr>
            <td><strong>${res.data}</strong><br><small>${res.hora}${hFim}</small></td>
            <td>${res.equipamento}</td>
            <td><strong>${evtNome}</strong></td>
            <td>${res.nome}<br><small>${res.contacto}</small></td>
            <td>${obsTexto}</td>
            <td style="text-align:center">
                <button onclick="prepararEdicao('${res.idFirebase}')" class="btn-edit">✎</button>
                <button onclick="apagar('${res.idFirebase}')" class="btn-delete">🗑</button>
            </td>
        </tr>`;
    });
}

function prepararEdicao(idFirebase) {
    const res = reservasAtivas.find(r => r.idFirebase === idFirebase);
    alternarVista('agenda');
    document.getElementById('checkData').value = res.data;
    document.getElementById('checkEquipamento').value = res.equipamento;
    verificarDisponibilidade(); 
    abrirForm(res.data, res.equipamento, idFirebase); 
}

function apagar(idFirebase) {
    if(confirm("Eliminar esta reserva permanentemente?")) { 
        db.ref('reservas/' + idFirebase).remove();
    }
}

function cancelarMarcacao() { document.getElementById('formularioReserva').style.display = 'none'; }
function logout() { window.location.reload(); }