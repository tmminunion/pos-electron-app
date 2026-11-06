const API_URL = 'http://127.0.0.1:3001/api/produk';

async function muatData() {
  try {
    const res = await fetch(API_URL);
    const data = await res.json();
    const tbody = document.querySelector('#tabel-produk tbody');
    tbody.innerHTML = '';
    
    data.forEach(item => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${item.nama}</td>
        <td>Rp ${Number(item.harga).toLocaleString('id-ID')}</td>
        <td>${new Date(item.updated_at).toLocaleTimeString('id-ID')}</td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error('Gagal mengambil data SQLite:', err);
  }
}

async function simpanProduk() {
  const nama = document.getElementById('nama').value;
  const harga = document.getElementById('harga').value;
  if (!nama || !harga) return alert('Lengkapi data');

  await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nama, harga: parseFloat(harga) })
  });

  document.getElementById('nama').value = '';
  document.getElementById('harga').value = '';
  muatData();
}

muatData();
