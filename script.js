document.addEventListener('DOMContentLoaded', () => {
  
  // ==========================================
  // 1. Interactive 3D Spaced Repetition Simulator
  // ==========================================
  
  // Mock flashcard data
  const mockDecks = [
    {
      category: "BİYOLOJİ",
      front: "Mitokondrinin temel hücresel görevi nedir?",
      back: "Oksijenli solunum gerçekleştirerek hücrenin ihtiyacı olan ATP (enerji) moleküllerini üretmektir.",
      hint: "Hücrenin enerji santrali olarak bilinir."
    },
    {
      category: "İNGİLİZCE KELİMELER",
      front: "İngilizce 'Ephemeral' kelimesinin Türkçe karşılığı ve anlamı nedir?",
      back: "'Geçici, kısa ömürlü, fani' anlamına gelir. Çok kısa süren veya kalıcı olmayan şeyler için kullanılır.",
      hint: "Eph-e-mer-al (adj.). Örnek: ephemeral beauty."
    },
    {
      category: "BİLGİSAYAR BİLİMLERİ",
      front: "JavaScript'te 'Promise.all()' fonksiyonunun temel amacı nedir?",
      back: "Verilen birden fazla Promise'in tamamının paralel olarak sonuçlanmasını bekler. Eğer herhangi biri hata alırsa, anında iptal edilir (reject olur).",
      hint: "Eşzamanlı (paralel) API isteklerinde hız kazandırır."
    },
    {
      category: "FİZİK",
      front: "Işık hızı boşlukta yaklaşık saniyede kaç kilometredir?",
      back: "Yaklaşık 300,000 km/saniye (tam olarak 299,792,458 m/s).",
      hint: "C harfi ile sembolize edilir."
    },
    {
      category: "TARİH",
      front: "İstanbul hangi tarihte fethedilmiştir?",
      back: "29 Mayıs 1453 tarihinde Fatih Sultan Mehmet komutasındaki Osmanlı ordusu tarafından fethedilmiştir.",
      hint: "Orta Çağ'ı kapatıp Yeni Çağ'ı açan olay."
    }
  ];

  let currentCardIndex = 0;
  let isCardFlipped = false;
  let currentLevel = 3;
  let currentXP = 160;
  const xpPerLevel = 200;
  let streakDays = 12;
  let memoryStrength = 82;
  let cardsStudiedSession = 0;

  const flashcard = document.getElementById('flashcard');
  const cardScene = document.getElementById('card-scene');
  const cardFrontText = document.getElementById('card-front-text');
  const cardBackText = document.getElementById('card-back-text');
  const cardHint = document.getElementById('card-hint');
  const confidenceControls = document.getElementById('confidence-controls');
  const helpText = document.getElementById('help-text');
  const cardIndexLabel = document.getElementById('card-index-label');
  
  // Gamification DOM elements
  const simLevel = document.getElementById('sim-level');
  const simCurrentXP = document.getElementById('sim-current-xp');
  const simXpProgress = document.getElementById('sim-xp-progress');
  const simXpRemaining = document.getElementById('sim-xp-remaining');
  const simStreak = document.getElementById('sim-streak');
  const simMemoryStrength = document.getElementById('sim-memory-strength');
  const simMemoryBar = document.getElementById('sim-memory-bar');
  const activityLog = document.getElementById('activity-log');
  const resetSimBtn = document.getElementById('reset-sim-btn');

  // Load first card
  function loadCard(index) {
    const cardData = mockDecks[index % mockDecks.length];
    
    // Setup texts
    cardFrontText.textContent = cardData.front;
    cardBackText.textContent = cardData.back;
    
    // Category update
    flashcard.querySelector('.card-front .card-category').textContent = cardData.category;
    flashcard.querySelector('.card-back .card-category').textContent = "CEVAP · " + cardData.category;
    
    // Reset flip status
    flashcard.classList.remove('flipped');
    isCardFlipped = false;
    
    // Update index badge
    cardIndexLabel.textContent = `Kart ${index + 1}/${mockDecks.length}`;
    
    // Reset hint text
    cardHint.textContent = "💡 İpucu Al";
    
    // Setup help description
    helpText.textContent = "Kartın üzerine tıklayarak cevabını gör.";
  }

  loadCard(currentCardIndex);

  // Card click to flip
  flashcard.addEventListener('click', (e) => {
    // If clicking target is the hint badge, show hint
    if (e.target.id === 'card-hint') {
      e.stopPropagation();
      const cardData = mockDecks[currentCardIndex % mockDecks.length];
      cardHint.textContent = cardData.hint;
      logEvent(`💡 İpucu görüntülendi: "${cardData.hint.substring(0, 30)}..."`, 'info');
      return;
    }
    
    // Prevent flip if clicking button controls
    if (e.target.closest('.simulator-controls')) {
      return;
    }

    flashcard.classList.toggle('flipped');
    isCardFlipped = flashcard.classList.contains('flipped');
    
    if (isCardFlipped) {
      helpText.textContent = "Cevabını değerlendirmek için aşağıdaki butonlardan birine tıkla.";
      confidenceControls.classList.add('visible');
    } else {
      helpText.textContent = "Kartın üzerine tıklayarak cevabını gör.";
      confidenceControls.classList.remove('visible');
    }
  });

  // Confidence buttons clicks (SM-2 implementation)
  const confidenceButtons = document.querySelectorAll('.btn-confidence');
  confidenceButtons.forEach(button => {
    button.addEventListener('click', (e) => {
      e.stopPropagation();
      
      const rating = button.getAttribute('data-rating');
      let xpEarned = 15;
      let memoryDelta = 0;
      let statusText = '';
      
      switch(rating) {
        case 'again':
          xpEarned = 10;
          memoryDelta = -8;
          statusText = 'Kartı hatırlayamadın. 1 dakika sonra tekrar gösterilecek.';
          break;
        case 'hard':
          xpEarned = 15;
          memoryDelta = -2;
          statusText = 'Zorlandın. Kart 1 gün sonrasına planlandı.';
          break;
        case 'good':
          xpEarned = 25;
          memoryDelta = 4;
          statusText = 'İyi hatırladın! Kart 3 gün sonrasına planlandı.';
          break;
        case 'easy':
          xpEarned = 35;
          memoryDelta = 8;
          statusText = 'Çok kolay geldi! Kart 7 gün sonrasına planlandı.';
          break;
      }
      
      // Floating XP Particle animation
      spawnXpFloat(e.clientX, e.clientY, `+${xpEarned} XP`);
      
      // Update states
      awardXP(xpEarned);
      updateMemory(memoryDelta);
      
      cardsStudiedSession++;
      
      // Log event
      const currentCard = mockDecks[currentCardIndex % mockDecks.length];
      logEvent(`✅ [${currentCard.category}] "${currentCard.front.substring(0, 30)}..." kartı '${rating.toUpperCase()}' olarak puanlandı. ${statusText} (+${xpEarned} XP)`, 'success');
      
      // Auto flip back and transition to next card
      confidenceControls.classList.remove('visible');
      helpText.textContent = "Kart planlanıyor...";
      
      setTimeout(() => {
        currentCardIndex++;
        loadCard(currentCardIndex);
        
        // Every 3 cards studied, increment streak daily as a fun demo effect
        if (cardsStudiedSession % 3 === 0) {
          streakDays++;
          simStreak.textContent = `${streakDays} Gün`;
          simStreak.classList.add('animate-bounce-effect');
          spawnXpFloat(window.innerWidth / 2, window.innerHeight / 2 - 100, `🔥 Seri Arttı! ${streakDays} Gün`, '#F59E0B');
          logEvent(`🔥 HARİKA! Günlük seriniz ${streakDays} güne çıktı! İstikrar kazandırır.`, 'streak');
          setTimeout(() => {
            simStreak.classList.remove('animate-bounce-effect');
          }, 1000);
        }
      }, 600);
    });
  });

  // Award XP Logic
  function awardXP(amount) {
    currentXP += amount;
    if (currentXP >= xpPerLevel) {
      currentXP -= xpPerLevel;
      currentLevel++;
      
      // Level Up animations and effects
      simLevel.textContent = currentLevel;
      simLevel.parentElement.classList.add('animate-bounce-effect');
      logEvent(`🎉 TEBRİKLER! Seviye atladınız! Yeni Seviyeniz: ${currentLevel}!`, 'level-up');
      
      // Floating massive badge
      spawnXpFloat(window.innerWidth / 2, window.innerHeight / 2, `✨ SEVİYE UP! Lv ${currentLevel} ✨`, '#10B981', 2000);
      
      setTimeout(() => {
        simLevel.parentElement.classList.remove('animate-bounce-effect');
      }, 1000);
    }
    
    // Update progress HTML
    simCurrentXP.textContent = currentXP;
    simXpRemaining.textContent = xpPerLevel - currentXP;
    simXpProgress.style.width = `${(currentXP / xpPerLevel) * 100}%`;
  }

  // Update memory strength
  function updateMemory(delta) {
    memoryStrength = Math.min(100, Math.max(30, memoryStrength + delta));
    simMemoryStrength.textContent = `${memoryStrength}%`;
    simMemoryBar.style.width = `${memoryStrength}%`;
    
    if (memoryStrength > 85) {
      simMemoryBar.style.backgroundColor = 'var(--primary)';
    } else if (memoryStrength > 60) {
      simMemoryBar.style.backgroundColor = '#10B981';
    } else {
      simMemoryBar.style.backgroundColor = '#F59E0B';
    }
  }

  // Float Particle Spawner
  function spawnXpFloat(x, y, text, color = 'var(--primary)', duration = 1200) {
    const el = document.createElement('div');
    el.className = 'floating-particle-xp';
    el.textContent = text;
    el.style.left = `${x || (window.innerWidth / 2)}px`;
    el.style.top = `${(y - 40) || (window.innerHeight / 2)}px`;
    if (color) el.style.color = color;
    if (color === '#F59E0B' || text.includes('SEVİYE')) {
      el.style.fontSize = '1.8rem';
      el.style.fontWeight = '900';
      el.style.textShadow = '0 0 10px rgba(245, 158, 11, 0.4)';
    }
    
    document.body.appendChild(el);
    
    setTimeout(() => {
      el.remove();
    }, duration);
  }

  // Logger
  function logEvent(message, type) {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const item = document.createElement('div');
    item.className = `log-item ${type || 'info'}`;
    item.innerHTML = `<span class="log-time">[${time}]</span> ${message}`;
    
    activityLog.appendChild(item);
    activityLog.scrollTop = activityLog.scrollHeight;
    
    // Truncate logs if too many
    while (activityLog.children.length > 20) {
      activityLog.removeChild(activityLog.firstChild);
    }
  }

  // Reset Simulation
  resetSimBtn.addEventListener('click', () => {
    currentCardIndex = 0;
    cardsStudiedSession = 0;
    currentLevel = 3;
    currentXP = 160;
    streakDays = 12;
    memoryStrength = 82;
    
    simLevel.textContent = currentLevel;
    simCurrentXP.textContent = currentXP;
    simXpRemaining.textContent = xpPerLevel - currentXP;
    simXpProgress.style.width = '80%';
    
    simStreak.textContent = "12 Gün";
    
    simMemoryStrength.textContent = "82%";
    simMemoryBar.style.width = "82%";
    simMemoryBar.style.backgroundColor = 'var(--primary)';
    
    activityLog.innerHTML = '<div class="log-item system">🔄 Simülatör sıfırlandı. Yeni çalışma seansınız başladı!</div>';
    
    loadCard(0);
    logEvent("⚡ Yeni temiz seans başlatıldı.", "info");
  });

  // ==========================================
  // 2. Interactive AI Flashcard Generator Simulator
  // ==========================================
  
  const generateAiBtn = document.getElementById('generate-ai-cards-btn');
  const aiTopicInput = document.getElementById('ai-topic-input');
  const aiTerminal = document.getElementById('ai-terminal');
  const terminalBody = document.getElementById('terminal-body');
  const aiResults = document.getElementById('ai-results');
  const aiCardsContainer = document.getElementById('ai-cards-container');
  const presetTags = document.querySelectorAll('.preset-tag');

  // AI Mock Card Database
  const aiGeneratedDB = {
    "JavaScript Array Metodları": [
      {
        front: ".map() metodu ne işe yarar?",
        back: "Dizi içerisindeki her elemanı bir fonksiyondan geçirerek yepyeni bir dizi oluşturur. Orijinal diziyi bozmaz.",
        hint: "Birebir dönüşüm elemanları."
      },
      {
        front: ".filter() metodu hangi amaçla kullanılır?",
        back: "Belirli bir koşulu sağlayan (true dönen) tüm elemanları süzüp yeni bir alt küme dizi oluşturur.",
        hint: "Koşul filtresi."
      },
      {
        front: ".reduce() metodunun ana işlevi nedir?",
        back: "Dizideki tüm elemanları bir akümülatör (toplayıcı) yardımıyla işleyerek tek bir çıktı değerine (sayı, nesne vb.) indirger.",
        hint: "Toplam veya birikim hesaplarında çok güçlüdür."
      }
    ],
    "Fotosentez Süreci": [
      {
        front: "Fotosentez temel olarak bitkinin hangi organelinde gerçekleşir?",
        back: "Klorofil pigmentlerini içeren yeşil renkli Kloroplast organelinde gerçekleşir.",
        hint: "Yaprak hücrelerinde yoğundur."
      },
      {
        front: "Işığa bağımlı reaksiyonlar kloroplastın neresinde gerçekleşir ve ne üretir?",
        back: "Granalardaki Tilakoit zarlarda gerçekleşir. Güneş ışığı emilerek ATP ve NADPH üretilir, yan ürün olarak Oksijen (O2) açığa çıkar.",
        hint: "Işık doğrudan gereklidir."
      },
      {
        front: "Calvin Döngüsü (Işıktan bağımsız evre) nerede gerçekleşir ve ne üretir?",
        back: "Kloroplastın Stroma adındaki sıvı kısmında gerçekleşir. Havadan alınan CO2 ile ışıklı evrede üretilen ATP/NADPH birleşerek Besin (Glikoz) üretilir.",
        hint: "Karanlık evre olarak da bilinir fakat ışık ürünlerine muhtaçtır."
      }
    ],
    "Coğrafi Keşifler": [
      {
        front: "Ümit Burnu'nu keşfederek Hindistan deniz yolunu aralayan kaşif kimdir?",
        back: "1488 yılında Portekizli denizci Bartolomeu Dias Ümit Burnu'nu (Cape of Good Hope) keşfetmiştir.",
        hint: "Afrika'nın en güney ucu."
      },
      {
        front: "Dünyayı dolaşan ilk deniz seferi kime aittir?",
        back: "Ferdinand Macellan tarafından başlatılmış, onun savaşta ölmesi üzerine yardımcısı Sebastian Elcano tarafından 1522'de tamamlanmıştır.",
        hint: "Dünyanın yuvarlak olduğunu kanıtlamıştır."
      },
      {
        front: "Coğrafi Keşiflerin Osmanlı İmparatorluğu'na en büyük ekonomik darbesi ne olmuştur?",
        back: "İpek ve Baharat yolları ile Akdeniz limanlarının önemini kaybetmesi, ticaret yollarının Atlas Okyanusu kıyılarına kayması olmuştur.",
        hint: "Gümrük gelirleri ciddi oranda düşmüştür."
      }
    ],
    "İngilizce İleri Seviye Fiiller": [
      {
        front: "'To Mitigate' fiilinin Türkçe anlamı ve eş anlamlısı nedir?",
        back: "'Hafifletmek, etkisini azaltmak, yatıştırmak' anlamına gelir. Eş anlamlıları: Alleviate, reduce, ease.",
        hint: "Örn: mitigate the risks (riskleri azaltmak)."
      },
      {
        front: "'To Advocate' fiili ne anlama gelir?",
        back: "Bir fikri, davayı veya kişiyi 'savunmak, desteklemek, arkasında durmak' anlamına gelir. İsim hali savunucudur.",
        hint: "Support veya defend fiillerinin resmi/akademik hali."
      },
      {
        front: "'To Evade' fiili hangi durumlarda kullanılır?",
        back: "'Kaçınmak, kaytarmak, sıyrılmak' demektir. Sorumluluklardan veya sorulardan kurnazca kaçmakta kullanılır.",
        hint: "Örn: evade taxes (vergi kaçırmak)."
      }
    ]
  };

  // Preset click
  presetTags.forEach(tag => {
    tag.addEventListener('click', () => {
      const topic = tag.getAttribute('data-topic');
      // If it's a key in our db, map it
      let displayTopic = topic;
      if (topic === "Fotosentez Süreci") displayTopic = "Fotosentez Süreci";
      if (topic === "Coğrafi Keşifler") displayTopic = "Coğrafi Keşifler";
      if (topic === "İngilizce İleri Seviye Fiiller") displayTopic = "İngilizce İleri Seviye Fiiller";
      
      aiTopicInput.value = displayTopic;
      triggerAiGeneration(displayTopic);
    });
  });

  // Button click
  generateAiBtn.addEventListener('click', () => {
    const topic = aiTopicInput.value.trim();
    if (!topic) {
      alert("Lütfen bir konu başlığı yazın!");
      return;
    }
    triggerAiGeneration(topic);
  });

  // Run AI simulation
  function triggerAiGeneration(topic) {
    generateAiBtn.disabled = true;
    aiResults.classList.remove('visible');
    aiTerminal.style.display = 'block';
    terminalBody.innerHTML = '';
    
    const lines = [
      `🚀 Mindify AI Model Engine [gpt-4o-mini] yükleniyor...`,
      `🔍 İstek alındı. Konu analizi yapılıyor: "${topic}"`,
      `🧠 Bilişsel semantik ağlar taranıyor...`,
      `⚙️ Eğitim müfredatları ve flashcard standartları [SM-2] entegre ediliyor...`,
      `✍️ Flashcard soru ve cevap çiftleri formüle ediliyor...`,
      `📝 Akıllı ipuçları ve kategori etiketleri ekleniyor...`,
      `✨ BAŞARILI! 3 adet yüksek kaliteli kart sentezlendi.`
    ];

    let currentLine = 0;
    
    function printLine() {
      if (currentLine < lines.length) {
        const div = document.createElement('div');
        div.className = 'term-line';
        
        // Style depending on content
        if (currentLine === 0) div.style.color = '#bccabb';
        if (currentLine === 1) div.style.color = '#10B981';
        if (currentLine === 5) div.style.color = '#F59E0B';
        if (currentLine === lines.length - 1) {
          div.style.color = '#4ade80';
          div.style.fontWeight = 'bold';
        }
        
        div.textContent = lines[currentLine];
        terminalBody.appendChild(div);
        aiTerminal.scrollTop = aiTerminal.scrollHeight;
        
        currentLine++;
        setTimeout(printLine, 400 + Math.random() * 300);
      } else {
        // Finished typing, show results!
        setTimeout(() => {
          aiTerminal.style.display = 'none';
          generateAiBtn.disabled = false;
          displayAiCards(topic);
        }, 800);
      }
    }

    printLine();
  }

  // Display Cards
  function displayAiCards(topic) {
    aiCardsContainer.innerHTML = '';
    
    // Find matching cards in db, or build fallback dynamic ones
    let cards = aiGeneratedDB[topic];
    
    if (!cards) {
      // Fallback generator for custom inputs
      cards = [
        {
          front: `"${topic}" kavramının temel tanımı nedir?`,
          back: `Yapay zeka tarafından üretilen bu kartta, girdiğiniz "${topic}" konusunun çekirdek yapısı ve ana hatları açıklanır. Detaylı çalışma modunda bunu özelleştirebilirsiniz.`,
          hint: `${topic} kavramı hakkında genel giriş.`
        },
        {
          front: `"${topic}" konusunun en önemli 3 pratik uygulama alanı veya örneği nedir?`,
          back: `1. Akademik araştırmalar ve makaleler.\n2. Profesyonel iş süreçleri geliştirme.\n3. Hızlı sınav hazırlıkları ve günlük genel kültür pratikleri.`,
          hint: `Hayatın içinden pratik faydaları.`
        },
        {
          front: `Neden "${topic}" konusunu Spaced Repetition (Aralıklı Tekrar) ile çalışmalıyım?`,
          back: `Çünkü bu konu bolca terim veya kavramsal detay içerir. SM-2 algoritması bunları unutma eşiğinizde size hatırlatarak kalıcı belleğinize kodlar.`,
          hint: `Ezberden kaçınmanın anahtarı.`
        }
      ];
    }
    
    cards.forEach((card, idx) => {
      const cardEl = document.createElement('div');
      cardEl.className = 'ai-card-wrapper animate-slide-in';
      cardEl.style.animationDelay = `${idx * 150}ms`;
      
      cardEl.innerHTML = `
        <div class="ai-card" id="ai-c-${idx}">
          <div class="ai-card-face ai-card-front">
            <span class="ai-card-badge">KART ${idx+1} · YAPAY ZEKA</span>
            <div class="ai-card-text">${card.front}</div>
            <div class="ai-card-click-tip">🔄 Çevirmek için tıkla</div>
          </div>
          <div class="ai-card-face ai-card-back">
            <span class="ai-card-badge answer">CEVAP · IPUCU: ${card.hint}</span>
            <div class="ai-card-text back-text">${card.back}</div>
            <div class="ai-card-click-tip">🔄 Çevirmek için tıkla</div>
          </div>
        </div>
      `;
      
      aiCardsContainer.appendChild(cardEl);
      
      // Flip event
      const innerCard = cardEl.querySelector('.ai-card');
      innerCard.addEventListener('click', () => {
        innerCard.classList.toggle('flipped');
        
        // If flipped, award a small 5 XP reward for interacting
        if (innerCard.classList.contains('flipped') && !innerCard.getAttribute('data-rewarded')) {
          innerCard.setAttribute('data-rewarded', 'true');
          awardXP(5);
          spawnXpFloat(window.innerWidth / 2, window.innerHeight / 2 + 100, "+5 XP AI İnceleme", "#10B981");
          logEvent(`✨ AI tarafından üretilen "${card.front.substring(0, 25)}..." kartını incelediniz (+5 XP)`, 'info');
        }
      });
    });
    
    aiResults.classList.add('visible');
    
    // Smooth scroll to results
    setTimeout(() => {
      aiResults.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 100);
  }

  // ==========================================
  // 3. Modern Accordion FAQ Section
  // ==========================================
  
  const accordionTriggers = document.querySelectorAll('.accordion-trigger');
  
  accordionTriggers.forEach(trigger => {
    trigger.addEventListener('click', () => {
      const isExpanded = trigger.getAttribute('aria-expanded') === 'true';
      
      // Close other accordions
      accordionTriggers.forEach(otherTrigger => {
        if (otherTrigger !== trigger) {
          otherTrigger.setAttribute('aria-expanded', 'false');
          otherTrigger.nextElementSibling.style.maxHeight = null;
          otherTrigger.querySelector('.icon-plus').classList.remove('rotate');
        }
      });
      
      // Toggle current
      trigger.setAttribute('aria-expanded', !isExpanded);
      const panel = trigger.nextElementSibling;
      const plusIcon = trigger.querySelector('.icon-plus');
      
      if (!isExpanded) {
        panel.style.maxHeight = panel.scrollHeight + "px";
        plusIcon.classList.add('rotate');
      } else {
        panel.style.maxHeight = null;
        plusIcon.classList.remove('rotate');
      }
    });
  });

  // ==========================================
  // 4. Early Access Lead Form with Confetti
  // ==========================================
  
  const earlyAccessForm = document.getElementById('early-access-form');
  const userEmailInput = document.getElementById('user-email');
  const formFeedback = document.getElementById('form-feedback');

  earlyAccessForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const email = userEmailInput.value.trim();
    if (!email) return;
    
    // Simulate API call
    formFeedback.textContent = "Kaydınız yapılıyor, lütfen bekleyin...";
    formFeedback.className = "form-feedback processing";
    
    setTimeout(() => {
      // Save to local storage as proof of submission
      let emails = JSON.parse(localStorage.getItem('mindify_early_emails') || '[]');
      emails.push({ email: email, date: new Date().toISOString() });
      localStorage.setItem('mindify_early_emails', JSON.stringify(emails));
      
      // Success feedback
      formFeedback.innerHTML = `🎉 <strong>Başarılı!</strong> Kaydınız yapıldı. 3 aylık <strong>Ücretsiz Premium</strong> kupon kodunuz <code>${email.split('@')[0].toUpperCase()}-MINDIFY3</code> e-posta adresinize gönderildi!`;
      formFeedback.className = "form-feedback success";
      userEmailInput.value = '';
      
      // Trigger gorgeous fullscreen confetti shower
      triggerConfetti();
      
      logEvent(`🚀 Yeni erken erişim kaydı yapıldı: ${email}! Aramıza hoş geldiniz.`, 'streak');
    }, 1200);
  });

  // Simple Confetti effect
  function triggerConfetti() {
    for (let i = 0; i < 80; i++) {
      const confetti = document.createElement('div');
      confetti.className = 'confetti-piece';
      
      // Random coordinates, colors, speeds
      const colors = ['#008B47', '#10B981', '#4ade80', '#F59E0B', '#3b82f6', '#f43f5e'];
      const randomColor = colors[Math.floor(Math.random() * colors.length)];
      
      confetti.style.backgroundColor = randomColor;
      confetti.style.left = `${Math.random() * 100}vw`;
      confetti.style.top = `-20px`;
      confetti.style.width = `${Math.random() * 10 + 6}px`;
      confetti.style.height = `${Math.random() * 18 + 8}px`;
      confetti.style.borderRadius = '3px';
      confetti.style.transform = `rotate(${Math.random() * 360}deg)`;
      
      const duration = Math.random() * 2000 + 2000;
      confetti.style.animation = `fallConfetti ${duration}ms linear forwards`;
      
      document.body.appendChild(confetti);
      
      setTimeout(() => {
        confetti.remove();
      }, duration);
    }
  }

});
