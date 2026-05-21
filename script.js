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
        painel.innerHTML = `❌ OCUPADO<br><small>Reservado para: ${ocupado.nome} (${ocupado.contacto})</small>`;
        document.getElementById('formularioReserva').style.display = 'none';
    } else {
        painel.className = "status-box disponivel";
        painel.innerHTML = `✅ LIVRE / DISPONÍVEL<br><button onclick="abrirForm('${data}', '${equip}')" style="background:var(--accent); color:white; border:none; padding:8px 15px; border-radius:8px; cursor:pointer; margin-top:10px;">Marcar Seleção</button>`;
    }
}

// FUNÇÕES PARA ADICIONAR OU REMOVER LINHAS DE DATA DINAMICAMENTE
function adicionarNovaLinhaData(valorData = "") {
    const container = document.getElementById('containerListaDias');
    const divLinha = document.createElement('div');
    divLinha.className = "linha-dia-btn";
    divLinha.innerHTML = `
        <input type="date" class="input-data-multipla" value="${valorData}" required style="margin-bottom: 5px;">
        <button type="button" onclick="this.parentElement.remove()" style="background:#e53e3e; color:white; border:none; border-radius:8px; padding:0 12px; cursor:pointer; height:42px; margin-top:2px;">✕</button>
    `;
    container.appendChild(divLinha);
}

function abrirForm(data, equip, idFirebase = -1) {
    const formDiv = document.getElementById('formularioReserva');
    formDiv.style.display = 'block';
    document.getElementById('editIndex').value = idFirebase;
    
    // Limpar seleções anteriores
    document.getElementById('containerListaDias').innerHTML = "";
    const checkboxes = document.querySelectorAll('#listaCheckboxesEquipamentos input[type="checkbox"]');
    checkboxes.forEach(cb => cb.checked = false);

    if (idFirebase !== -1) {
        // MODO EDIÇÃO INDIVIDUAL
        document.getElementById('containerMultiplosCampos').style.display = 'none';
        const res = reservasAtivas.find(r => r.idFirebase === idFirebase);
        document.getElementById('tituloForm').innerText = "Editar Marcação";
        document.getElementById('nome').value = res.nome;
        document.getElementById('contacto').value = res.contacto;
        document.getElementById('hora').value = res.hora;
        document.getElementById('obs').value = res.obs || "";
        document.getElementById('btnConfirmarForm').innerText = "Atualizar Dados";
    } else {
        // MODO NOVA RESERVA MÚLTIPLA
        document.getElementById('containerMultiplosCampos').style.display = 'block';
        document.getElementById('tituloForm').innerText = "Nova Marcação Múltipla";
        document.getElementById('reservaForm').reset();
        
        // Ativar por padrão o equipamento e o dia verificados inicialmente
        checkboxes.forEach(cb => {
            if (cb.value === equip) cb.checked = true;
        });
        adicionarNovaLinhaData(data);
        
        document.getElementById('btnConfirmarForm').innerText = "Confirmar e Gravar Tudo";
    }
}

// SUBMISSÃO REFEITA
document.getElementById('reservaForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const idFirebase = document.getElementById('editIndex').value;
    
    const nomeInput = document.getElementById('nome').value;
    const contactoInput = document.getElementById('contacto').value;
    const horaInput = document.getElementById('hora').value;
    const obsInput = document.getElementById('obs').value;

    if (idFirebase !== "-1") {
        // Atualizar edição simples
        const resAntiga = reservasAtivas.find(r => r.idFirebase === idFirebase);
        const dados = {
            nome: nomeInput,
            contacto: contactoInput,
            equipamento: resAntiga.equipamento,
            data: resAntiga.data,
            hora: horaInput,
            obs: obsInput 
        };
        db.ref('reservas/' + idFirebase).set(dados);
    } else {
        // PROCESSAR MULTI-RESERVA (CHECKBOXES E ENTRADAS DINÂMICAS)
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

        // Gravar cada combinação individualmente na nuvem
        locaisSelecionados.forEach(local => {
            datasSelecionadas.forEach(data => {
                const dadosCombina = {
                    nome: nomeInput,
                    contacto: contactoInput,
                    equipamento: local,
                    data: data,
                    hora: horaInput,
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

// HISTÓRICO COM FILTRO POR EQUIPAMENTO
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
        corpo.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:20px;">Nenhuma reserva encontrada para este filtro.</td></tr>`;
        return;
    }

    ordenadas.forEach((res) => {
        const obsTexto = res.obs ? `<br><span style="font-size:12px; color:#a0aec0; font-style:italic;">Obs: ${res.obs}</span>` : "";
        corpo.innerHTML += `<tr>
            <td>${res.data}<br><small>${res.hora}</small></td>
            <td>${res.equipamento}</td>
            <td><strong>${res.nome}</strong><br><small>${res.contacto}</small>${obsTexto}</td>
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