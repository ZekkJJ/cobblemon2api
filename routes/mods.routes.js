/**
 * Mods Routes - Endpoints para gestión de mods del servidor
 * Cobblemon Los Pitufos
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');

// Configurar directorio de uploads
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads', 'mods');

// Asegurar que el directorio existe
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  console.log('[MODS] Created uploads directory:', UPLOADS_DIR);
}

// Función para sanitizar nombres de archivo de forma más permisiva
const sanitizeFilename = (filename) => {
  // Preservar la extensión
  const ext = path.extname(filename).toLowerCase();
  const name = path.basename(filename, ext);
  
  // Reemplazar caracteres problemáticos pero mantener más legibilidad
  const safeName = name
    .replace(/\s+/g, '_')           // espacios -> guiones bajos
    .replace(/[()[\]{}]/g, '')      // quitar paréntesis y corchetes
    .replace(/[+]/g, '_plus_')      // + -> _plus_
    .replace(/[^a-zA-Z0-9._-]/g, '_') // otros caracteres -> guiones bajos
    .replace(/_+/g, '_')            // múltiples guiones bajos -> uno solo
    .replace(/^_|_$/g, '');         // quitar guiones bajos al inicio/final
  
  return safeName + ext;
};

// Configurar multer para subida de archivos
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (_req, file, cb) => {
    const safeName = sanitizeFilename(file.originalname);
    console.log(`[MODS] Sanitized filename: "${file.originalname}" -> "${safeName}"`);
    cb(null, safeName);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 200 * 1024 * 1024, // 200MB max
    fieldSize: 10 * 1024 * 1024, // 10MB for text fields
  },
  fileFilter: (_req, file, cb) => {
    // Solo permitir .jar y .zip (case insensitive)
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === '.jar' || ext === '.zip') {
      cb(null, true);
    } else {
      console.warn(`[MODS] Rejected file: ${file.originalname} (extension: ${ext})`);
      cb(new Error(`Solo se permiten archivos .jar o .zip. Recibido: ${ext}`));
    }
  }
});

/**
 * Initialize mods routes with database connection
 */
function initModsRoutes(getDb) {
  
  // Add CORS headers specifically for file uploads
  router.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    }
    next();
  });

  // Middleware para manejar errores de multer
  const handleMulterError = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
      console.error(`[MODS] Multer error: ${err.code} - ${err.message}`);
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ 
          error: 'Archivo demasiado grande',
          message: 'El archivo excede el límite de 200MB'
        });
      }
      return res.status(400).json({ 
        error: 'Error de subida',
        message: err.message 
      });
    } else if (err) {
      console.error(`[MODS] Upload error: ${err.message}`);
      return res.status(400).json({ 
        error: 'Error de archivo',
        message: err.message 
      });
    }
    next();
  };
  
  // Helper to get mods collection
  const getModsCollection = () => getDb().collection('mods');
  
  // Helper to calculate package version based on mod versions
  const calculatePackageVersion = (mods) => {
    const hash = crypto.createHash('md5');
    mods.forEach(m => hash.update(`${m._id}:${m.version}`));
    return hash.digest('hex').substring(0, 8);
  };

  // ============================================
  // GET /api/mods - List all active mods
  // ============================================
  router.get('/', async (req, res) => {
    try {
      const mods = await getModsCollection().find({ isActive: true }).toArray();
      
      // Calculate counts
      const requiredMods = mods.filter(m => m.category === 'required');
      const optionalMods = mods.filter(m => m.category === 'optional');
      const resourcePacks = mods.filter(m => m.category === 'resourcepack');
      
      // Calculate package info
      const totalSize = requiredMods.reduce((sum, m) => sum + (m.originalSize || 0), 0);
      const pkgVersion = calculatePackageVersion(requiredMods);
      
      res.json({
        mods,
        totalRequired: requiredMods.length,
        totalOptional: optionalMods.length,
        totalResourcePacks: resourcePacks.length,
        packageVersion: pkgVersion,
        packageSize: totalSize,
      });
    } catch (error) {
      console.error('[MODS] Error getting mods:', error);
      res.status(500).json({ error: 'Error al obtener mods' });
    }
  });

  // ============================================
  // GET /api/mods/debug - Debug endpoint to check mod files
  // ============================================
  router.get('/debug', async (_req, res) => {
    try {
      const mods = await getModsCollection().find({}).toArray();
      
      const analysis = {
        total: mods.length,
        withFiles: 0,
        withoutFiles: 0,
        withZeroSize: 0,
        filesExist: 0,
        filesMissing: 0,
        uploadsDir: UPLOADS_DIR,
        uploadsDirExists: fs.existsSync(UPLOADS_DIR),
        mods: []
      };
      
      for (const mod of mods) {
        const hasFilePath = mod.filePath && mod.filePath.length > 0;
        const hasSize = mod.originalSize && mod.originalSize > 0;
        const fileExists = hasFilePath && fs.existsSync(mod.filePath);
        
        if (hasFilePath && hasSize) {
          analysis.withFiles++;
          if (fileExists) {
            analysis.filesExist++;
          } else {
            analysis.filesMissing++;
          }
        } else if (hasFilePath && !hasSize) {
          analysis.withZeroSize++;
        } else {
          analysis.withoutFiles++;
        }
        
        analysis.mods.push({
          name: mod.name,
          filename: mod.filename,
          filePath: mod.filePath || null,
          originalSize: mod.originalSize || 0,
          hasFilePath,
          hasSize,
          fileExists,
          category: mod.category,
          isActive: mod.isActive,
        });
      }
      
      // List files in uploads directory
      if (analysis.uploadsDirExists) {
        try {
          analysis.filesInUploadsDir = fs.readdirSync(UPLOADS_DIR);
        } catch (e) {
          analysis.filesInUploadsDir = [];
          analysis.uploadsDirError = e.message;
        }
      }
      
      console.log('[MODS] Debug info:', JSON.stringify(analysis, null, 2));
      res.json(analysis);
    } catch (error) {
      console.error('[MODS] Debug error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================
  // DELETE /api/mods/cleanup - Remove mods without valid files
  // ============================================
  router.delete('/cleanup', async (_req, res) => {
    try {
      const result = await getModsCollection().deleteMany({
        $or: [
          { filePath: null },
          { filePath: '' },
          { filePath: { $exists: false } },
          { originalSize: 0 },
          { originalSize: null },
          { originalSize: { $exists: false } },
        ]
      });
      
      console.log(`[MODS] Cleanup: deleted ${result.deletedCount} mods without files`);
      res.json({ 
        success: true, 
        deletedCount: result.deletedCount,
        message: `Eliminados ${result.deletedCount} mods sin archivos`
      });
    } catch (error) {
      console.error('[MODS] Cleanup error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================
  // POST /api/mods/test-upload - Test file upload without saving to DB
  // ============================================
  router.post('/test-upload', upload.single('file'), handleMulterError, async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ 
          success: false, 
          error: 'No se recibió archivo',
          tip: 'Asegúrate de que el archivo tenga extensión .jar o .zip'
        });
      }
      
      const result = {
        success: true,
        originalName: req.file.originalname,
        savedAs: req.file.filename,
        size: req.file.size,
        sizeFormatted: `${(req.file.size / 1024 / 1024).toFixed(2)} MB`,
        path: req.file.path,
        mimetype: req.file.mimetype,
      };
      
      // Eliminar el archivo de prueba
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
        result.deleted = true;
      }
      
      console.log('[MODS] Test upload successful:', result);
      res.json(result);
    } catch (error) {
      // Limpiar archivo si existe
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      console.error('[MODS] Test upload error:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  });

  // ============================================
  // GET /api/mods/versions - Get mod versions for update checking
  // ============================================
  router.get('/versions', async (req, res) => {
    try {
      const mods = await getModsCollection().find({ isActive: true }).toArray();
      
      const versions = {};
      mods.forEach(m => {
        versions[m._id.toString()] = m.version;
      });
      
      const requiredMods = mods.filter(m => m.category === 'required');
      const pkgVersion = calculatePackageVersion(requiredMods);
      
      res.json({
        versions,
        packageVersion: pkgVersion,
      });
    } catch (error) {
      console.error('[MODS] Error getting versions:', error);
      res.status(500).json({ error: 'Error al obtener versiones' });
    }
  });

  // ============================================
  // GET /api/mods/package/info - Get package info without downloading
  // ============================================
  router.get('/package/info', async (req, res) => {
    try {
      const mods = await getModsCollection().find({ 
        isActive: true, 
        category: 'required' 
      }).toArray();
      
      const totalSize = mods.reduce((sum, m) => sum + (m.originalSize || 0), 0);
      const pkgVersion = calculatePackageVersion(mods);
      
      res.json({
        version: pkgVersion,
        size: totalSize,
        modCount: mods.length,
        mods: mods.map(m => ({ id: m._id, name: m.name, version: m.version })),
      });
    } catch (error) {
      console.error('[MODS] Error getting package info:', error);
      res.status(500).json({ error: 'Error al obtener info del paquete' });
    }
  });

  // ============================================
  // GET /api/mods/search - Search mods
  // ============================================
  router.get('/search', async (req, res) => {
    try {
      const { q } = req.query;
      if (!q) {
        return res.status(400).json({ error: 'Query parameter required' });
      }
      
      const mods = await getModsCollection().find({
        isActive: true,
        $or: [
          { name: { $regex: q, $options: 'i' } },
          { description: { $regex: q, $options: 'i' } },
          { author: { $regex: q, $options: 'i' } },
        ]
      }).toArray();
      
      res.json({ mods });
    } catch (error) {
      console.error('[MODS] Error searching mods:', error);
      res.status(500).json({ error: 'Error al buscar mods' });
    }
  });

  // ============================================
  // GET /api/mods/package - Download all required mods as ZIP
  // IMPORTANTE: Esta ruta debe estar ANTES de /:id
  // ============================================
  router.get('/package', async (_req, res) => {
    try {
      const archiver = require('archiver');
      
      const mods = await getModsCollection().find({ 
        isActive: true, 
        category: 'required' 
      }).toArray();
      
      if (mods.length === 0) {
        return res.status(404).json({ error: 'No hay mods requeridos' });
      }
      
      const pkgVersion = calculatePackageVersion(mods);
      
      // Set headers for ZIP download
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="LosPitufos-Mods-v${pkgVersion}.zip"`);
      
      // Create ZIP archive
      const archive = archiver('zip', { zlib: { level: 6 } }); // Level 6 for balance speed/compression
      
      archive.on('error', (err) => {
        console.error('[MODS] Archive error:', err);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Error al generar ZIP' });
        }
      });
      
      // Pipe archive to response
      archive.pipe(res);
      
      // Add README
      const readme = `# Mods de Cobblemon Los Pitufos
      
Version del paquete: ${pkgVersion}
Fecha: ${new Date().toISOString()}

## Instrucciones de instalacion:
1. Cierra Minecraft completamente
2. Copia todos los archivos .jar a tu carpeta de mods:
   - Windows: %appdata%\\.minecraft\\mods
   - Mac: ~/Library/Application Support/minecraft/mods
   - Linux: ~/.minecraft/mods
3. Inicia Minecraft con Fabric Loader 1.20.1

## Mods incluidos:
${mods.map(m => `- ${m.name} v${m.version}`).join('\n')}

## Soporte:
Discord: https://discord.gg/lospitufos
`;
      archive.append(readme, { name: 'LEEME.txt' });
      
      // Add each mod
      let addedCount = 0;
      let failedMods = [];
      
      for (const mod of mods) {
        try {
          // Prioridad 1: Archivo local
          if (mod.filePath && fs.existsSync(mod.filePath)) {
            archive.file(mod.filePath, { name: mod.filename });
            addedCount++;
            console.log(`[MODS] Added local file: ${mod.filename}`);
          }
          // Prioridad 2: URL externa
          else if (mod.downloadUrl) {
            try {
              const response = await fetch(mod.downloadUrl, {
                headers: { 'User-Agent': 'CobblemonLosPitufos/1.0' }
              });
              if (response.ok) {
                const buffer = await response.arrayBuffer();
                archive.append(Buffer.from(buffer), { name: mod.filename });
                addedCount++;
                console.log(`[MODS] Downloaded and added: ${mod.filename}`);
              } else {
                console.warn(`[MODS] Failed to download ${mod.name}: ${response.status}`);
                failedMods.push(mod.name);
              }
            } catch (fetchErr) {
              console.warn(`[MODS] Fetch error for ${mod.name}:`, fetchErr.message);
              failedMods.push(mod.name);
            }
          }
          // No file available
          else {
            console.warn(`[MODS] No file source for ${mod.name}`);
            failedMods.push(mod.name);
          }
        } catch (modErr) {
          console.error(`[MODS] Error processing mod ${mod.name}:`, modErr);
          failedMods.push(mod.name);
        }
      }
      
      // Add info about failed mods if any
      if (failedMods.length > 0) {
        const failedInfo = `# Mods que no se pudieron incluir

Los siguientes mods no tienen archivo disponible y deben descargarse manualmente:

${failedMods.map(name => `- ${name}`).join('\n')}

Visita https://modrinth.com para descargarlos.
`;
        archive.append(failedInfo, { name: 'DESCARGAR_MANUAL.txt' });
      }
      
      console.log(`[MODS] Package generated with ${addedCount}/${mods.length} mods`);
      
      // Finalize archive
      await archive.finalize();
      
    } catch (error) {
      console.error('[MODS] Error generating package:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Error al generar paquete' });
      }
    }
  });

  // ============================================
  // GET /api/mods/:id - Get single mod
  // IMPORTANTE: Esta ruta debe estar DESPUÉS de las rutas específicas
  // ============================================
  router.get('/:id', async (req, res) => {
    try {
      const { ObjectId } = require('mongodb');
      
      // Validar que el ID sea un ObjectId válido
      if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
        return res.status(400).json({ error: 'ID de mod inválido' });
      }
      
      const mod = await getModsCollection().findOne({ 
        _id: new ObjectId(req.params.id),
        isActive: true 
      });
      
      if (!mod) {
        return res.status(404).json({ error: 'Mod no encontrado' });
      }
      
      res.json(mod);
    } catch (error) {
      console.error('[MODS] Error getting mod:', error);
      res.status(500).json({ error: 'Error al obtener mod' });
    }
  });

  // ============================================
  // GET /api/mods/:id/download - Download mod file
  // ============================================
  router.get('/:id/download', async (req, res) => {
    try {
      const { ObjectId } = require('mongodb');
      
      // Validar que el ID sea un ObjectId válido
      if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
        return res.status(400).json({ error: 'ID de mod inválido' });
      }
      
      const mod = await getModsCollection().findOne({ 
        _id: new ObjectId(req.params.id),
        isActive: true 
      });
      
      if (!mod) {
        return res.status(404).json({ error: 'Mod no encontrado' });
      }
      
      // Prioridad 1: Archivo local
      if (mod.filePath && fs.existsSync(mod.filePath)) {
        res.setHeader('Content-Disposition', `attachment; filename="${mod.filename}"`);
        res.setHeader('Content-Type', 'application/java-archive');
        res.setHeader('Content-Length', mod.originalSize || fs.statSync(mod.filePath).size);
        return res.sendFile(path.resolve(mod.filePath));
      }
      
      // Prioridad 2: URL externa
      if (mod.downloadUrl) {
        return res.redirect(mod.downloadUrl);
      }
      
      // Fallback: return mod info with download instructions
      res.status(404).json({ 
        error: 'Archivo no disponible',
        mod: {
          name: mod.name,
          version: mod.version,
          website: mod.website,
        },
        message: 'El archivo debe descargarse desde la fuente original'
      });
    } catch (error) {
      console.error('[MODS] Error downloading mod:', error);
      res.status(500).json({ error: 'Error al descargar mod' });
    }
  });

  // ============================================
  // POST /api/mods - Create new mod (admin only)
  // ============================================
  router.post('/', upload.single('file'), handleMulterError, async (req, res) => {
    try {
      const { 
        name, 
        description, 
        version, 
        category, 
        modLoader, 
        minecraftVersion,
        author,
        website,
        downloadUrl,
        filename: providedFilename,
        originalSize: providedSize,
        changelog,
      } = req.body;
      
      if (!name || !description || !category) {
        // Si se subió archivo, eliminarlo
        if (req.file && fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
        return res.status(400).json({ error: 'name, description, and category are required' });
      }
      
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      
      // Determinar filename para verificar duplicados
      let filename = providedFilename || `${slug}.jar`;
      if (req.file) {
        filename = req.file.originalname;
      }
      
      // Verificar si ya existe un mod con el mismo filename (activo)
      const existingMod = await getModsCollection().findOne({ 
        filename: filename,
        isActive: true 
      });
      
      if (existingMod) {
        // Si se subió archivo, eliminarlo ya que es duplicado
        if (req.file && fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
        console.log(`[MODS] Duplicate detected: ${filename} (existing: ${existingMod.name})`);
        return res.status(409).json({ 
          error: 'duplicate',
          message: `El mod "${existingMod.name}" ya existe con este archivo`,
          existingMod: {
            _id: existingMod._id,
            name: existingMod.name,
            version: existingMod.version,
          }
        });
      }
      
      // Si se subió un archivo, usar su info
      let filePath = null;
      let fileSize = parseInt(providedSize) || 0;
      let checksum = '';
      
      if (req.file) {
        filePath = req.file.path;
        fileSize = req.file.size;
        
        // Calcular checksum del archivo
        const fileBuffer = fs.readFileSync(filePath);
        checksum = crypto.createHash('sha256').update(fileBuffer).digest('hex');
        
        console.log(`[MODS] File uploaded: ${filename} (${fileSize} bytes)`);
      }
      
      const newMod = {
        name,
        slug,
        version: version || '1.0.0',
        description,
        category: category || 'optional',
        modLoader: modLoader || 'fabric',
        minecraftVersion: minecraftVersion || '1.20.1',
        author: author || '',
        website: website || '',
        downloadUrl: downloadUrl || '',
        filePath: filePath, // Ruta local del archivo
        filename: filename,
        originalSize: fileSize,
        compressedSize: 0,
        checksum: checksum,
        changelog: changelog || '',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        previousVersions: [],
      };
      
      const result = await getModsCollection().insertOne(newMod);
      newMod._id = result.insertedId;
      
      console.log(`[MODS] Created mod: ${name}${filePath ? ' (with file)' : ''}`);
      res.status(201).json(newMod);
    } catch (error) {
      // Si hay error y se subió archivo, eliminarlo
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      console.error('[MODS] Error creating mod:', error);
      res.status(500).json({ error: 'Error al crear mod' });
    }
  });

  // ============================================
  // PUT /api/mods/:id - Update mod (admin only)
  // ============================================
  router.put('/:id', upload.single('file'), handleMulterError, async (req, res) => {
    try {
      const { ObjectId } = require('mongodb');
      const modId = new ObjectId(req.params.id);
      
      const existingMod = await getModsCollection().findOne({ _id: modId });
      if (!existingMod) {
        return res.status(404).json({ error: 'Mod no encontrado' });
      }
      
      const updateData = { ...req.body, updatedAt: new Date() };
      delete updateData._id; // Don't update _id
      delete updateData.file; // Remove file from body data
      
      // Si se subió un nuevo archivo
      if (req.file) {
        // Eliminar archivo anterior si existe
        if (existingMod.filePath && fs.existsSync(existingMod.filePath)) {
          fs.unlinkSync(existingMod.filePath);
          console.log(`[MODS] Deleted old file: ${existingMod.filePath}`);
        }
        
        updateData.filePath = req.file.path;
        updateData.filename = req.file.originalname;
        updateData.originalSize = req.file.size;
        
        // Calcular checksum
        const fileBuffer = fs.readFileSync(req.file.path);
        updateData.checksum = crypto.createHash('sha256').update(fileBuffer).digest('hex');
        
        console.log(`[MODS] New file uploaded: ${req.file.originalname}`);
      }
      
      // If version changed, archive old version
      if (updateData.version && updateData.version !== existingMod.version) {
        updateData.previousVersions = [
          ...(existingMod.previousVersions || []),
          {
            version: existingMod.version,
            filename: existingMod.filename,
            uploadedAt: existingMod.updatedAt,
          }
        ];
      }
      
      await getModsCollection().updateOne(
        { _id: modId },
        { $set: updateData }
      );
      
      const updatedMod = await getModsCollection().findOne({ _id: modId });
      console.log(`[MODS] Updated mod: ${updatedMod.name}`);
      res.json(updatedMod);
    } catch (error) {
      console.error('[MODS] Error updating mod:', error);
      res.status(500).json({ error: 'Error al actualizar mod' });
    }
  });

  // ============================================
  // DELETE /api/mods/:id - Soft delete mod (admin only)
  // ============================================
  router.delete('/:id', async (req, res) => {
    try {
      const { ObjectId } = require('mongodb');
      const modId = new ObjectId(req.params.id);
      
      const result = await getModsCollection().updateOne(
        { _id: modId },
        { $set: { isActive: false, deletedAt: new Date() } }
      );
      
      if (result.matchedCount === 0) {
        return res.status(404).json({ error: 'Mod no encontrado' });
      }
      
      console.log(`[MODS] Soft deleted mod: ${req.params.id}`);
      res.json({ success: true, message: 'Mod eliminado' });
    } catch (error) {
      console.error('[MODS] Error deleting mod:', error);
      res.status(500).json({ error: 'Error al eliminar mod' });
    }
  });

  return router;
}

module.exports = { initModsRoutes };
