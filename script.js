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

function abrirForm(data, equip, idFirebase = -1) {
    const formDiv = document.getElementById('formularioReserva');
    formDiv.style.display = 'block';
    document.getElementById('editIndex').value = idFirebase;

    // Se for uma edição de registo já existente
    if (idFirebase !== -1) {
        document.getElementById('containerMultiplosCampos').style.display = 'none'; // Esconde escolha múltipla na edição
        const res = reservasAtivas.find(r => r.idFirebase === idFirebase);
        document.getElementById('tituloForm').innerText = "Editar Marcação";
        document.getElementById('nome').value = res.nome;
        document.getElementById('contacto').value = res.contacto;
        document.getElementById('hora').value = res.hora;
        document.getElementById('obs').value = res.obs || "";
        document.getElementById('btnConfirmarForm').innerText = "Atualizar Dados";
    } else {
        // Nova marcação múltipla
        document.getElementById('containerMultiplosCampos').style.display = 'block';
        document.getElementById('tituloForm').innerText = "Nova Marcação Múltipla";
        document.getElementById('reservaForm').reset();
        
        // Auto-selecionar o que foi verificado no checker inicial
        document.getElementById('finalDataMultipla').value = data;
        const selectMultiplo = document.getElementById('finalEquipamentoMultiplo');
        for (let option of selectMultiplo.options) {
            option.selected = (option.value === equip);
        }
        
        document.getElementById('btnConfirmarForm').innerText = "Confirmar e Gravar Tudo";
    }
}

// SUBMISSÃO COM REPETIÇÃO DE DIAS E LOCAIS
document.getElementById('reservaForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const idFirebase = document.getElementById('editIndex').value;
    
    const nomeInput = document.getElementById('nome').value;
    const contactoInput = document.getElementById('contacto').value;
    const horaInput = document.getElementById('hora').value;
    const obsInput = document.getElementById('obs').value;

    if (idFirebase !== "-1") {
        // Modo Edição Individual Simples
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
        // MODO MULTI-MARCAÇÃO (Vários Locais e/ou Vários Dias)
        const selectLocais = document.getElementById('finalEquipamentoMultiplo');
        
        // Obter array com todos os locais selecionados no select
        let locaisSelecionados = [];
        for (let option of selectLocais.options) {
            if (option.selected) locaisSelecionados.push(option.value);
        }

        // Obter array com todas as datas inseridas na linha de texto
        let datasTexto = document.getElementById('finalDataMultipla').value;
        let datasSelecionadas = datasTexto.split(',').map(d => d.trim()).filter(d => d.length > 0);

        if (locaisSelecionados.length === 0 || datasSelecionadas.length === 0) {
            alert("Por favor, selecione pelo menos um equipamento e uma data válida.");
            return;
        }

        // Executa loops combinando cada dia com cada local e enviando individualmente para a nuvem
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