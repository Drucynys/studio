const fs = require('fs');

function patch(file, replacements) {
    if (!fs.existsSync(file)) return;
    let content = fs.readFileSync(file, 'utf8');
    for (const [search, replace] of replacements) {
        content = content.split(search).join(replace);
    }
    // Add import if needed
    if (content.includes('useUIStore()') || content.includes('useUIStore.getState()')) {
        if (!content.includes('useUIStore')) {
            content = content.replace('import { useAuth } from "@/hooks/useAuth";', 'import { useAuth } from "@/hooks/useAuth";\nimport { useUIStore } from "@/store/useUIStore";');
        }
    }
    fs.writeFileSync(file, content);
}

patch('src/context/AuthContext.tsx', [
    ['isAuthModalOpen: boolean;\n', ''],
    ['openAuthModal: () => void;\n', ''],
    ['closeAuthModal: () => void;\n', ''],
    ['const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);\n', ''],
    ['const openAuthModal = useCallback(() => setIsAuthModalOpen(true), []);\n', ''],
    ['const closeAuthModal = useCallback(() => setIsAuthModalOpen(false), []);\n', ''],
    ['isAuthModalOpen,\n', ''],
    ['openAuthModal,\n', ''],
    ['closeAuthModal,\n', ''],
    ['isAuthModalOpen, openAuthModal, closeAuthModal,', ''],
    ['closeAuthModal();', 'useUIStore.getState().closeAuthModal();'],
    ['import { useToast } from', 'import { useUIStore } from "@/store/useUIStore";\nimport { useToast } from']
]);

patch('src/app/page.tsx', [
    ['const { user, openAuthModal, collection, loginAsDemoGuest } = useAuth();', 'const { user, collection, loginAsDemoGuest } = useAuth();\n  const { openAuthModal } = useUIStore();']
]);

patch('src/app/add-card/page.tsx', [
    ['const { user, addCardToCollection, openAuthModal } = useAuth();', 'const { user, addCardToCollection } = useAuth();\n  const { openAuthModal } = useUIStore();']
]);

patch('src/app/exchange/page.tsx', [
    ['const { user, openAuthModal } = useAuth();', 'const { user } = useAuth();\n  const { openAuthModal } = useUIStore();']
]);

patch('src/app/friends/page.tsx', [
    ['const { user, openAuthModal, following, loadingFollowing } = useAuth();', 'const { user, following, loadingFollowing } = useAuth();\n    const { openAuthModal } = useUIStore();']
]);

patch('src/app/my-collection/page.tsx', [
    ['openAuthModal,\n', ''],
    ['const {', 'const { openAuthModal } = useUIStore();\n  const {']
]);

patch('src/app/settings/page.tsx', [
    ['openAuthModal,\n', ''],
    ['const {', 'const { openAuthModal } = useUIStore();\n  const {'],
    ['openAuthModal, profileForm', 'useUIStore.getState().openAuthModal, profileForm'],
    ['openAuthModal();', 'useUIStore.getState().openAuthModal();']
]);

patch('src/components/AuthButton.tsx', [
    ['const { user, loading, role, openAuthModal, logOut } = useAuth();', 'const { user, loading, role, logOut } = useAuth();\n  const { openAuthModal } = useUIStore();']
]);

patch('src/components/AuthModal.tsx', [
    ['const { isAuthModalOpen, closeAuthModal, signUp, signIn, signInWithGoogle, loginAsDemoGuest } = useAuth();', 'const { signUp, signIn, signInWithGoogle, loginAsDemoGuest } = useAuth();\n  const { isAuthModalOpen, closeAuthModal } = useUIStore();']
]);

patch('src/components/AddCardToCollectionDialog.tsx', [
    ['const { user, addCardToCollection, removeCardFromCollection, addCardToWishlist, removeCardFromWishlist, openAuthModal, collection, wishlist } = useAuth();', 'const { user, addCardToCollection, removeCardFromCollection, addCardToWishlist, removeCardFromWishlist, collection, wishlist } = useAuth();\n  const { openAuthModal } = useUIStore();']
]);
