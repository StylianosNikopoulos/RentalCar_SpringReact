import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { useQueryClient } from '@tanstack/react-query';
import vehicleService from '../../services/vehicleService';
import toast from 'react-hot-toast';
import { useLang } from '../../context/LangContext';
import { translations } from '../../i18n/translations';

const VehicleModal = ({ vehicleToEdit, onClose }) => {
    const queryClient = useQueryClient();
    const { lang } = useLang();
    const t = translations[lang].admin;

    const isEditMode = Boolean(vehicleToEdit);
    const [plateError, setPlateError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [vehicleForm, setVehicleForm] = useState({
        brand: '',
        model: '',
        dailyPrice: '',
        fuelType: '',
        licensePlate: '',
        year: new Date().getFullYear(),
        images: []
    });

    useEffect(() => {
        if (vehicleToEdit) {
            const rawImages = vehicleToEdit.imageUrls || vehicleToEdit.images || [];
            const formattedImages = rawImages.map(item => ({
                url: typeof item === 'object' ? item.url : item,
                isMain: (typeof item === 'object' ? item.url : item) === vehicleToEdit.mainImageUrl
            }));

            setVehicleForm({
                brand: vehicleToEdit.brand || '',
                model: vehicleToEdit.model || '',
                dailyPrice: vehicleToEdit.dailyPrice || '',
                fuelType: vehicleToEdit.fuelType || '',
                licensePlate: vehicleToEdit.licensePlate || '',
                year: vehicleToEdit.year || new Date().getFullYear(),
                images: formattedImages
            });
        }
    }, [vehicleToEdit]);

    const handlePlateChange = (e) => {
        const value = e.target.value.toUpperCase();
        setVehicleForm(prev => ({ ...prev, licensePlate: value }));
        setPlateError(value && !/^[A-Z]{3}-\d{4}$/.test(value) ? t.plateFormat : '');
    };

    const handleImagesChange = (e) => {
        const files = Array.from(e.target.files);
        files.forEach(file => {
            const reader = new FileReader();
            reader.onloadend = () => {
                setVehicleForm(prev => ({
                    ...prev,
                    images: [...prev.images, { url: reader.result, file: file, isMain: prev.images.length === 0 }]
                }));
            };
            reader.readAsDataURL(file);
        });
    };

    const setMainImage = (index) => {
        setVehicleForm(prev => ({
            ...prev,
            images: prev.images.map((img, i) => ({ ...img, isMain: i === index }))
        }));
    };

    const removeImage = (index) => {
        setVehicleForm(prev => {
            const updated = prev.images.filter((_, i) => i !== index);
            if (updated.length > 0 && !updated.some(img => img.isMain)) updated[0].isMain = true;
            return { ...prev, images: updated };
        });
    };

    const uploadToCloudinary = async (file) => {
        const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
        const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
        if (!cloudName || !uploadPreset || cloudName.startsWith('your_') || uploadPreset.startsWith('your_')) {
            throw new Error('Cloudinary is not configured. Set VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET.');
        }

        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', uploadPreset);
        const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
            method: 'POST', body: formData
        });
        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`Cloudinary upload failed (${response.status}): ${errorBody}`);
        }
        const data = await response.json();
        return data.secure_url;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (isSubmitting) return;
        if (vehicleForm.images.length === 0) return toast.error(t.toastImgReq);

        setIsSubmitting(true);
        const loadingToast = toast.loading(isEditMode ? t.toastProcessing : t.toastCreating);
        try {
            const uploadPromises = vehicleForm.images.map(async (img) => {
                if (img.url.startsWith('http')) return { url: img.url, isMain: img.isMain };
                const uploadedUrl = await uploadToCloudinary(img.file);
                return { url: uploadedUrl, isMain: img.isMain };
            });

            const uploadedImagesMetadata = await Promise.all(uploadPromises);
            const urlsArray = uploadedImagesMetadata.map(img => img.url);
            const mainImgObj = uploadedImagesMetadata.find(img => img.isMain) || uploadedImagesMetadata[0];

            const payload = {
                brand: vehicleForm.brand,
                model: vehicleForm.model,
                year: parseInt(vehicleForm.year),
                fuelType: vehicleForm.fuelType,
                licensePlate: vehicleForm.licensePlate,
                dailyPrice: parseFloat(vehicleForm.dailyPrice),
                imageUrls: urlsArray,
                mainImageUrl: mainImgObj.url
            };

            if (isEditMode) {
                await vehicleService.updateVehicle(vehicleToEdit.id, payload);
            } else {
                await vehicleService.createVehicle(payload);
            }
            
            toast.success(isEditMode ? t.toastVehUpdated : t.toastVehCreated, { id: loadingToast });
            queryClient.invalidateQueries({ queryKey: ['admin-vehicles'] });
            onClose();
        } catch (error) {
            toast.error(t.toastOpFailed, { id: loadingToast });
        } finally {
            setIsSubmitting(false);
        }
    };

    const modalContent = (
        <div className="modal-overlay">
            <div className="admin-modal glass-morphism">
                <h3>{isEditMode ? t.modalUpdateTitle : t.modalAddTitle}</h3>
                <form onSubmit={handleSubmit}>
                    <div className="admin-form-group">
                        <input type="text" placeholder={t.placeholderBrand} required value={vehicleForm.brand} onChange={e => setVehicleForm({...vehicleForm, brand: e.target.value})} />
                        <input type="text" placeholder={t.placeholderModel} required value={vehicleForm.model} onChange={e => setVehicleForm({...vehicleForm, model: e.target.value})} />
                    </div>

                    <div className="image-grid-upload">
                        {vehicleForm.images.map((img, index) => (
                            <div key={index} className={`image-preview-item ${img.isMain ? 'main-photo' : ''}`}>
                                <img src={img.url} alt="preview" />
                                <div className="image-controls">
                                    <button type="button" onClick={() => setMainImage(index)} title={t.setMainPhoto}><i className={img.isMain ? "fas fa-star" : "far fa-star"}></i></button>
                                    <button type="button" onClick={() => removeImage(index)} title={t.removePhoto}><i className="fas fa-times"></i></button>
                                </div>
                                {img.isMain && <span className="main-label">{t.mainLabel}</span>}
                            </div>
                        ))}
                        <label className="add-more-photos"><i className="fas fa-plus"></i><input type="file" multiple accept="image/*" onChange={handleImagesChange} hidden /></label>
                    </div>

                    <div className="admin-form-group mt-20">
                        <input type="number" step="0.01" className="no-spinners" placeholder={t.placeholderPrice} required value={vehicleForm.dailyPrice} onChange={e => setVehicleForm({...vehicleForm, dailyPrice: e.target.value})} />
                        <div className="flex-1">
                            <input type="text" placeholder={t.placeholderPlate} className={plateError ? 'input-error' : ''} required value={vehicleForm.licensePlate} onChange={handlePlateChange} />
                            {plateError && <span className="error-text">{plateError}</span>}
                        </div>
                    </div>

                    <div className="admin-form-group">
                        <input type="number" placeholder={t.placeholderYear} value={vehicleForm.year} onChange={e => setVehicleForm({...vehicleForm, year: e.target.value})} />
                        <div className="select-wrapper">
                            <select className="admin-select" required value={vehicleForm.fuelType} onChange={e => setVehicleForm({...vehicleForm, fuelType: e.target.value})}>
                                <option value="" disabled>{t.placeholderFuel}</option>
                                <option value="GASOLINE">{t.fuelGasoline}</option>
                                <option value="DIESEL">{t.fuelDiesel}</option>
                                <option value="ELECTRIC">{t.fuelElectric}</option>
                                <option value="HYBRID">{t.fuelHybrid}</option>
                            </select>
                        </div>
                    </div>

                    <div className="modal-actions" style={{ marginTop: '20px', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                        <button type="button" className="btn-cancel" onClick={onClose}>{t.btnCancel}</button>
                        <button type="submit" className="add-btn" disabled={isSubmitting}>
                            {isSubmitting ? t.btnSaving || "Saving..." : isEditMode ? t.btnUpdate : t.btnSave}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );

    return ReactDOM.createPortal(modalContent, document.body);
};

export default VehicleModal;
